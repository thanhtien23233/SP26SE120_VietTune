using System;

namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class InstrumentDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = default!;
        public string Category { get; set; } = default!;
        public string? Description { get; set; }
        public string? TuningSystem { get; set; }
        public string? ConstructionMethod { get; set; }
        public string? ImageUrl { get; set; }
        public Guid? OriginEthnicGroupId { get; set; }
    }

    public class CreateInstrumentDto
    {
        public string Name { get; set; } = default!;
        public string Category { get; set; } = default!;
        public string? Description { get; set; }
        public string? TuningSystem { get; set; }
        public string? ConstructionMethod { get; set; }
        public string? ImageUrl { get; set; }
        public Guid? OriginEthnicGroupId { get; set; }
    }

    public class UpdateInstrumentDto
    {
        public string? Name { get; set; }
        public string? Category { get; set; }
        public string? Description { get; set; }
        public string? TuningSystem { get; set; }
        public string? ConstructionMethod { get; set; }
        public string? ImageUrl { get; set; }
        public Guid? OriginEthnicGroupId { get; set; }
    }
    public class GetInstrumentDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
    }
}
