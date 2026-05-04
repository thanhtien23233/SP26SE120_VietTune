using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;

namespace VietTuneArchive.Controllers;

/// <summary>
/// Reverse geocoding: chuyển tọa độ (lat, lon) thành địa chỉ dạng chữ.
/// Dùng Nominatim (OpenStreetMap); không cần API key.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class GeocodeController : ControllerBase
{
    private const string NominatimBase = "https://nominatim.openstreetmap.org";
    /// <summary>User-Agent bắt buộc theo chính sách Nominatim; email dùng để nhận diện ứng dụng.</summary>
    private const string UserAgent = "VietTuneArchive/1.0 (https://github.com/viettune)";
    private const string NominatimEmail = "viettune@example.com";
    private readonly IHttpClientFactory _httpClientFactory;

    public GeocodeController(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    /// <summary>
    /// Reverse geocode: trả về địa chỉ dạng chữ từ tọa độ (dùng Nominatim/OSM).
    /// GET /api/Geocode/reverse?lat=10.966070&amp;lon=106.492149
    /// </summary>
    [HttpGet("reverse")]
    public async Task<IActionResult> Reverse([FromQuery] double lat, [FromQuery] double lon, CancellationToken cancellationToken = default)
    {
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180)
            return BadRequest(new { message = "Tọa độ không hợp lệ (lat: -90..90, lon: -180..180)." });

        var latStr = lat.ToString(CultureInfo.InvariantCulture);
        var lonStr = lon.ToString(CultureInfo.InvariantCulture);
        var coordinates = $"{latStr}, {lonStr}";
        var url = $"{NominatimBase}/reverse?format=json&lat={latStr}&lon={lonStr}&email={Uri.EscapeDataString(NominatimEmail)}&accept-language=vi";

        var client = _httpClientFactory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.TryAddWithoutValidation("User-Agent", UserAgent);
        request.Headers.TryAddWithoutValidation("Accept-Language", "vi");

        try
        {
            var response = await client.SendAsync(request, cancellationToken);

            if ((int)response.StatusCode == 429)
            {
                await Task.Delay(1500, cancellationToken);
                request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.TryAddWithoutValidation("User-Agent", UserAgent);
                request.Headers.TryAddWithoutValidation("Accept-Language", "vi");
                response = await client.SendAsync(request, cancellationToken);
            }

            if (!response.IsSuccessStatusCode)
                return Ok(new { address = $"Tọa độ: {coordinates}", coordinates, addressFromService = false });

            var contentType = response.Content.Headers.ContentType?.MediaType ?? "";
            if (!contentType.Contains("json", StringComparison.OrdinalIgnoreCase))
                return Ok(new { address = $"Tọa độ: {coordinates}", coordinates, addressFromService = false });

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var displayName = ExtractDisplayName(json);
            if (string.IsNullOrWhiteSpace(displayName))
                return Ok(new { address = $"Tọa độ: {coordinates}", coordinates, addressFromService = false });

            var address = BuildAddressWithHouseNumber(json, displayName.Trim());
            if (IsVietnam(GetCountryFromJson(json)))
                address = RemoveVietnamCountryFromEnd(address);
            return Ok(new { address, coordinates, addressFromService = true });
        }
        catch (Exception)
        {
            return Ok(new { address = $"Tọa độ: {coordinates}", coordinates, addressFromService = false });
        }
    }

    private static string? ExtractDisplayName(string json)
    {
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            var root = doc.RootElement;
            return root.TryGetProperty("display_name", out var prop) ? prop.GetString() : null;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Lấy mã hoặc tên quốc gia từ JSON (address.country_code hoặc address.country).
    /// </summary>
    private static string? GetCountryFromJson(string json)
    {
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            var root = doc.RootElement;
            var code = GetAddressPart(root, "country_code");
            if (!string.IsNullOrWhiteSpace(code)) return code.Trim();
            var name = GetAddressPart(root, "country");
            return name;
        }
        catch
        {
            return null;
        }
    }

    private static bool IsVietnam(string? country)
    {
        if (string.IsNullOrWhiteSpace(country)) return false;
        var c = country.Trim();
        return c.Equals("vn", StringComparison.OrdinalIgnoreCase)
            || c.Equals("Vietnam", StringComparison.OrdinalIgnoreCase)
            || c.Equals("Việt Nam", StringComparison.OrdinalIgnoreCase)
            || c.Equals("Viet Nam", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Loại bỏ tên quốc gia Việt Nam ở cuối địa chỉ (chỉ gọi khi đã xác định địa chỉ tại Việt Nam).
    /// </summary>
    private static string RemoveVietnamCountryFromEnd(string address)
    {
        if (string.IsNullOrWhiteSpace(address)) return address;
        var s = address.Trim();
        // Xóa ", Vietnam", ", Việt Nam", ", Viet Nam" ở cuối (không phân biệt hoa thường)
        s = Regex.Replace(s, @",\s*(Vietnam|Việt Nam|Viet Nam)\s*$", "", RegexOptions.IgnoreCase);
        return s.Trim().TrimEnd(',').Trim();
    }

    /// <summary>
    /// Lấy giá trị string từ address.xxx (nếu có).
    /// </summary>
    private static string? GetAddressPart(System.Text.Json.JsonElement root, string key)
    {
        if (!root.TryGetProperty("address", out var addr)) return null;
        return addr.TryGetProperty(key, out var p) ? p.GetString()?.Trim() : null;
    }

    /// <summary>
    /// Dựng địa chỉ có số nhà: ưu tiên house_number + road từ address object, sau đó phần còn lại (không mã bưu điện), chuẩn hóa đơn vị hành chính.
    /// </summary>
    private static string BuildAddressWithHouseNumber(string json, string displayName)
    {
        string? houseNumber = null;
        string? road = null;
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            var root = doc.RootElement;
            houseNumber = GetAddressPart(root, "house_number");
            road = GetAddressPart(root, "road");
        }
        catch
        {
            // ignore
        }

        var baseAddress = RemovePostalCodeAndNormalize(displayName);

        if (string.IsNullOrWhiteSpace(houseNumber) && string.IsNullOrWhiteSpace(road))
            return baseAddress;

        var numberAndRoad = string.Join(" ", new[] { houseNumber, road }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim();
        if (string.IsNullOrEmpty(numberAndRoad)) return baseAddress;

        // Nếu địa chỉ đã bắt đầu bằng số nhà + đường thì không ghép trùng
        if (baseAddress.StartsWith(numberAndRoad, StringComparison.OrdinalIgnoreCase))
            return baseAddress;

        return numberAndRoad + ", " + baseAddress;
    }

    /// <summary>
    /// Loại bỏ mã bưu điện (5–6 chữ số) khỏi địa chỉ, rồi chuẩn hóa theo đơn vị hành chính sau sáp nhập.
    /// </summary>
    private static string RemovePostalCodeAndNormalize(string address)
    {
        if (string.IsNullOrWhiteSpace(address)) return address;

        var s = address;

        // Không hiển thị mã bưu điện: xóa các đoạn chỉ gồm 5–6 chữ số (VN postcode)
        s = Regex.Replace(s, @",\s*\d{5,6}\b", "", RegexOptions.None);
        s = Regex.Replace(s, @"\s*\d{5,6}\s*,", ",", RegexOptions.None);

        // Chuẩn hóa theo đơn vị hành chính sau sáp nhập
        s = NormalizeAddressPostMerger(s);
        return s;
    }

    /// <summary>
    /// Chuẩn hóa địa chỉ theo đơn vị hành chính sau sáp nhập (VD: Quận 1 TP.HCM từ 2025).
    /// Ví dụ: "Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh" → "Phường Sài Gòn, thành phố Hồ Chí Minh".
    /// </summary>
    private static string NormalizeAddressPostMerger(string address)
    {
        if (string.IsNullOrWhiteSpace(address)) return address;

        var s = address;

        // Quận 1 TP.HCM: phường sau sáp nhập (từ 1/7/2025)
        s = s.Replace("Phường Bến Nghé, Quận 1", "Phường Sài Gòn", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("Bến Nghé, Quận 1", "Phường Sài Gòn", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("Phường Tân Định, Quận 1", "Phường Tân Định", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("Phường Đa Kao, Quận 1", "Phường Tân Định", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("Phường Bến Thành, Quận 1", "Phường Bến Thành", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("Phường Phạm Ngũ Lão, Quận 1", "Phường Bến Thành", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("Phường Nguyễn Thái Bình, Quận 1", "Phường Bến Thành", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("Phường Cầu Ông Lãnh, Quận 1", "Phường Cầu Ông Lãnh", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("Phường Nguyễn Cư Trinh, Quận 1", "Phường Cầu Ông Lãnh", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("Phường Cầu Kho, Quận 1", "Phường Cầu Ông Lãnh", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("Phường Cô Giang, Quận 1", "Phường Cầu Ông Lãnh", StringComparison.OrdinalIgnoreCase);

        // Thống nhất "Thành phố Hồ Chí Minh" → "thành phố Hồ Chí Minh"
        s = s.Replace("Thành phố Hồ Chí Minh", "thành phố Hồ Chí Minh", StringComparison.OrdinalIgnoreCase);

        // Loại bỏ "Quận 1" thừa sau khi đã gộp vào tên phường (tránh "Phường Sài Gòn, Quận 1, ...")
        s = s.Replace(", Quận 1, ", ", ", StringComparison.OrdinalIgnoreCase);
        s = s.Replace(", Quận 1", "", StringComparison.OrdinalIgnoreCase);

        // Thu gọn dấu phẩy/ khoảng trắng thừa
        while (s.Contains(", ,", StringComparison.Ordinal)) s = s.Replace(", ,", ", ");
        while (s.Contains("  ", StringComparison.Ordinal)) s = s.Replace("  ", " ");

        // Các từ chỉ loại địa danh: không viết hoa chữ cái đầu
        s = LowercaseAddressKeywords(s);

        return s.Trim().TrimEnd(',').Trim();
    }

    /// <summary>
    /// Viết thường chữ cái đầu của các từ: hẻm, đường, khu phố, ấp, phường, xã, đặc khu, tỉnh, thành phố.
    /// </summary>
    private static string LowercaseAddressKeywords(string address)
    {
        if (string.IsNullOrWhiteSpace(address)) return address;

        var s = address;

        // Cụm hai từ trước (tránh thay "phố" trong "thành phố" riêng)
        s = s.Replace("Thành phố", "thành phố", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("Khu phố", "khu phố", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("Đặc khu", "đặc khu", StringComparison.OrdinalIgnoreCase);

        // Từ đơn
        s = s.Replace("Phường", "phường", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("Đường", "đường", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("Hẻm", "hẻm", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("Ấp", "ấp", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("Xã", "xã", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("Tỉnh", "tỉnh", StringComparison.OrdinalIgnoreCase);

        return s;
    }
}
