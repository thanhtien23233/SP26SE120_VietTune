using AutoMapper;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Application.Mapper
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // ============= GEOGRAPHIC ENTITIES =============
            CreateMap<Province, ProvinceDto>().ReverseMap();
            CreateMap<District, DistrictDto>().ReverseMap();
            CreateMap<Commune, CommuneDto>().ReverseMap();

            // ============= REFERENCE DATA =============
            CreateMap<EthnicGroup, EthnicGroupDto>().ReverseMap();
            CreateMap<Instrument, InstrumentDto>().ReverseMap();
            CreateMap<Ceremony, CeremonyDto>().ReverseMap();
            CreateMap<VocalStyle, VocalStyleDto>().ReverseMap();
            CreateMap<MusicalScale, MusicalScaleDto>().ReverseMap();
            CreateMap<Tag, TagDto>().ReverseMap();

            // ============= USER & AUTH =============
            CreateMap<User, UserDTO>().ReverseMap();
            CreateMap<RefreshToken, RefreshTokenDto>().ReverseMap();
            CreateMap<AuditLog, AuditLogDto>().ReverseMap();

            // ============= RECORDING & RELATED =============
            CreateMap<Recording, RecordingDto>()
                .ForMember(dest => dest.InstrumentIds, 
                    opt => opt.MapFrom(src => src.RecordingInstruments != null 
                        ? src.RecordingInstruments.Select(ri => ri.InstrumentId).ToList() 
                        : new List<Guid>()))
                .ReverseMap();
            CreateMap<RecordingImage, RecordingImageDto>().ReverseMap();

            // ============= SUBMISSION & REVIEW =============
            CreateMap<Submission, SubmissionDto>().ReverseMap();
            CreateMap<Submission, GetSubmissionDto>();
            CreateMap<SubmissionVersion, SubmissionVersionDto>().ReverseMap();
            CreateMap<Review, ReviewDto>().ReverseMap();

            // ============= ANNOTATION =============
            CreateMap<Annotation, AnnotationDto>().ReverseMap();

            // ============= VECTOR & AUDIO ANALYSIS =============
            CreateMap<VectorEmbedding, VectorEmbeddingDto>().ReverseMap();
            CreateMap<AudioAnalysisResult, AudioAnalysisResultDto>().ReverseMap();

            // ============= KNOWLEDGE BASE =============
            CreateMap<KBEntry, KBEntryDto>().ReverseMap();
            CreateMap<KBRevision, KBRevisionDto>().ReverseMap();
            CreateMap<KBCitation, KBCitationDto>().ReverseMap();

            // ============= Q&A SYSTEM =============
            CreateMap<QAConversation, QAConversationDto>().ReverseMap();
            CreateMap<QAMessage, QAMessageDto>().ReverseMap();
        }
    }
}
