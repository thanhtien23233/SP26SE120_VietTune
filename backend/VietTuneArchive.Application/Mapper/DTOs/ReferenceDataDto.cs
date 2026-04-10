namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class ReferenceDataDto
    {
        public class ReferenceItemDto
        {
            public string Id { get; set; } = default!;
            public string Name { get; set; } = default!;
            public string Code { get; set; } = default!;
        }

        public class EthnicGroupDto : ReferenceItemDto { }

        public class EthnicGroupDetailDto : EthnicGroupDto
        {
            public string Population { get; set; } = default!;
            public string Distribution { get; set; } = default!;
            public string Description { get; set; } = default!;
        }

        public class MusicGenreDto
        {
            public string Id { get; set; } = default!;
            public string Name { get; set; } = default!;
            public string? ParentId { get; set; }
            public List<MusicGenreDto> Children { get; set; } = new();
        }

        public class LanguageDto : ReferenceItemDto { }

        public class ReferenceBundleDto
        {
            public List<EthnicGroupDto> EthnicGroups { get; set; } = new();
            // ✅ FIXED: Reference LocationDataDto versions - but these cause circular reference
            // Let's just remove them to avoid Swagger schema conflicts
            // public List<LocationDataDto.RegionDto> Regions { get; set; } = new();
            // public List<LocationDataDto.ProvinceDto> Provinces { get; set; } = new();
            public List<MusicGenreDto> MusicGenres { get; set; } = new();
            public List<ReferenceItemDto> EventTypes { get; set; } = new();
            public List<ReferenceItemDto> PerformanceTypes { get; set; } = new();
            public List<LanguageDto> Languages { get; set; } = new();
            public List<ReferenceItemDto> LicenseTypes { get; set; } = new();
        }
    }
}
