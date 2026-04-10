namespace VietTuneArchive.Application.Mapper.DTOs.Request
{
    public class InstrumentRequest
    {
        public class CreateInstrumentRequest
        {
            public string Name { get; set; } = default!;
            public string Category { get; set; } = default!;
            public string[] EthnicGroups { get; set; } = default!;
            public string Description { get; set; } = default!;
        }

        public class UpdateInstrumentRequest
        {
            public string? Name { get; set; }
            public string? Category { get; set; }
            public string[]? EthnicGroups { get; set; }
            public string? Description { get; set; }
        }
    }
}
