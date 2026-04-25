using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.Tests.TestHelpers.Builders;

public class RecordingBuilder
{
    public static Recording BuildRecording(Guid id)
    {
        return new Recording
        {
            Id = id,
            Title = "Original Title",
            Status = SubmissionStatus.Draft,
            RecordingInstruments = new List<RecordingInstrument>()
        };
    }

    public static RecordingDto BuildValidDto()
    {
        return new RecordingDto
        {
            Title = "Valid Test Title",
            Description = "A valid test description",
            CommuneId = Guid.NewGuid(),
            EthnicGroupId = Guid.NewGuid(),
            CeremonyId = Guid.NewGuid(),
            MusicalScaleId = Guid.NewGuid(),
            VocalStyleId = Guid.NewGuid(),
            InstrumentIds = new List<Guid> { Guid.NewGuid() },
            RecordingDate = DateTime.UtcNow,
            DurationSeconds = 120
        };
    }
}
