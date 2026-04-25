using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class KBRevisionService : GenericService<KBRevision, KBRevisionDto>, IKBRevisionService
    {
        private readonly IKBRevisionRepository _revisionRepository;
        private readonly IUserRepository _userRepository;
        private readonly IKBEntryRepository _entryRepository;

        public KBRevisionService(IKBRevisionRepository repository, IMapper mapper, IUserRepository userRepository, IKBEntryRepository entryRepository)
            : base(repository, mapper)
        {
            _revisionRepository = repository ?? throw new ArgumentNullException(nameof(repository));
            _userRepository = userRepository;
            _entryRepository = entryRepository;
        }

        /// <summary>
        /// Get all revisions of an entry
        /// </summary>
        public async Task<ServiceResponse<List<KBRevisionDto>>> GetByEntryAsync(Guid entryId)
        {
            try
            {
                if (entryId == Guid.Empty)
                    throw new ArgumentException("Entry id cannot be empty", nameof(entryId));

                var revisions = await _revisionRepository.GetAsync(r => r.EntryId == entryId);
                var dtos = _mapper.Map<List<KBRevisionDto>>(revisions.OrderByDescending(r => r.CreatedAt).ToList());
                return new ServiceResponse<List<KBRevisionDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} revisions"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<KBRevisionDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get revisions by editor
        /// </summary>
        public async Task<ServiceResponse<List<KBRevisionDto>>> GetByEditorAsync(Guid editorId)
        {
            try
            {
                if (editorId == Guid.Empty)
                    throw new ArgumentException("Editor id cannot be empty", nameof(editorId));

                var revisions = await _revisionRepository.GetAsync(r => r.EditorId == editorId);
                var dtos = _mapper.Map<List<KBRevisionDto>>(revisions.OrderByDescending(r => r.CreatedAt).ToList());
                return new ServiceResponse<List<KBRevisionDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} revisions"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<KBRevisionDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get latest revision of an entry
        /// </summary>
        public async Task<ServiceResponse<KBRevisionDto>> GetLatestRevisionAsync(Guid entryId)
        {
            try
            {
                if (entryId == Guid.Empty)
                    throw new ArgumentException("Entry id cannot be empty", nameof(entryId));

                var revisions = await _revisionRepository.GetAsync(r => r.EntryId == entryId);
                var latestRevision = revisions.OrderByDescending(r => r.CreatedAt).FirstOrDefault();

                if (latestRevision == null)
                    return new ServiceResponse<KBRevisionDto>
                    {
                        Success = false,
                        Message = "No revisions found"
                    };

                var dto = _mapper.Map<KBRevisionDto>(latestRevision);
                return new ServiceResponse<KBRevisionDto>
                {
                    Success = true,
                    Data = dto,
                    Message = "Retrieved latest revision successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<KBRevisionDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get revision count for an entry
        /// </summary>
        public async Task<ServiceResponse<int>> GetRevisionCountAsync(Guid entryId)
        {
            try
            {
                if (entryId == Guid.Empty)
                    throw new ArgumentException("Entry id cannot be empty", nameof(entryId));

                var count = await _revisionRepository.CountAsync(r => r.EntryId == entryId);
                return new ServiceResponse<int>
                {
                    Success = true,
                    Data = count,
                    Message = "Revision count retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<int>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Search revisions by note
        /// </summary>
        public async Task<ServiceResponse<List<KBRevisionDto>>> SearchByNoteAsync(string keyword)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(keyword))
                    throw new ArgumentException("Search keyword cannot be empty", nameof(keyword));

                var revisions = await _revisionRepository.GetAsync(r =>
                    r.RevisionNote != null && r.RevisionNote.Contains(keyword));
                var dtos = _mapper.Map<List<KBRevisionDto>>(revisions);
                return new ServiceResponse<List<KBRevisionDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} revisions"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<KBRevisionDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        public async Task<ServiceResponse<bool>> RollbackAsync(Guid entryId, Guid revisionId, Guid currentUserId)
        {
            try
            {
                var user = await _userRepository.GetByIdAsync(currentUserId);
                if (user == null || user.Role == "Contributor")
                    return new ServiceResponse<bool> { Success = false, Message = "Forbidden: Unauthorized to rollback" };

                var entry = await _entryRepository.GetByIdAsync(entryId);
                if (entry == null)
                    return new ServiceResponse<bool> { Success = false, Message = "Entry not found" };

                var revisionToRollback = await _revisionRepository.GetByIdAsync(revisionId);
                if (revisionToRollback == null || revisionToRollback.EntryId != entryId)
                    return new ServiceResponse<bool> { Success = false, Message = "Revision not found" };

                // Restore entry content
                entry.Content = revisionToRollback.Content;
                entry.UpdatedAt = DateTime.UtcNow;
                await _entryRepository.UpdateAsync(entry);

                // Create new revision to track rollback
                var newRevision = new KBRevision
                {
                    Id = Guid.NewGuid(),
                    EntryId = entryId,
                    EditorId = currentUserId,
                    Content = revisionToRollback.Content,
                    RevisionNote = $"Rollback to revision {revisionId}",
                    CreatedAt = DateTime.UtcNow
                };
                await _entryRepository.CreateRevisionAsync(newRevision);

                return new ServiceResponse<bool> { Success = true, Message = "Rollback successful", Data = true };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<bool> { Success = false, Message = ex.Message, Errors = new List<string> { ex.Message } };
            }
        }
    }
}
