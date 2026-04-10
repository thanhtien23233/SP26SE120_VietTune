using AutoMapper;
using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class QAConversationService : GenericService<QAConversation, QAConversationDto>, IQAConversationService
    {
        private readonly IQAConversationRepository _conversationRepository;
        private readonly IUserRepository _userRepository;
        private readonly IMapper _mapper;
        public QAConversationService(IQAConversationRepository conversationRepository, IUserRepository userRepository, IMapper mapper)
            : base(conversationRepository, mapper)
        {
            _conversationRepository = conversationRepository ?? throw new ArgumentNullException(nameof(conversationRepository));
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        }

        /// <summary>
        /// Get conversations by user
        /// </summary>
        public async Task<Result<IEnumerable<QAConversationDto>>> GetByUserAsync(Guid userId)
        {
            try
            {
                if (userId == Guid.Empty)
                    throw new ArgumentException("User id cannot be empty", nameof(userId));
                var userExists = await _userRepository.GetByIdAsync(userId);
                if (userExists == null)
                    throw new ArgumentException("User not found", nameof(userId));
                var conversations = await _conversationRepository.GetByUserId(userId);
                var dtos = _mapper.Map<IEnumerable<QAConversationDto>>(conversations);
                return Result<IEnumerable<QAConversationDto>>.Success(dtos, "Conversations retrieved successfully");
            }
            catch (Exception ex)
            {
                return Result<IEnumerable<QAConversationDto>>.Failure("Error retrieving conversations: " + ex.Message);
            }
        }

        /// <summary>
        /// Get recent conversations
        /// </summary>
        public async Task<ServiceResponse<List<QAConversationDto>>> GetRecentAsync(int count = 10)
        {
            try
            {
                if (count <= 0)
                    throw new ArgumentException("Count must be greater than 0", nameof(count));

                var conversations = await _conversationRepository.GetAllAsync();
                var recent = conversations
                    .OrderByDescending(c => c.CreatedAt)
                    .Take(count)
                    .ToList();

                var dtos = _mapper.Map<List<QAConversationDto>>(recent);
                return new ServiceResponse<List<QAConversationDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Retrieved {dtos.Count} recent conversations"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<QAConversationDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Search conversations by title
        /// </summary>
        public async Task<ServiceResponse<List<QAConversationDto>>> SearchByTitleAsync(string title)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(title))
                    throw new ArgumentException("Search title cannot be empty", nameof(title));

                var conversations = await _conversationRepository.GetAsync(c =>
                    c.Title != null && c.Title.Contains(title));
                var dtos = _mapper.Map<List<QAConversationDto>>(conversations);
                return new ServiceResponse<List<QAConversationDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} conversations"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<QAConversationDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get user conversation count
        /// </summary>
        public async Task<ServiceResponse<int>> GetUserConversationCountAsync(Guid userId)
        {
            try
            {
                if (userId == Guid.Empty)
                    throw new ArgumentException("User id cannot be empty", nameof(userId));

                var count = await _conversationRepository.CountAsync(c => c.UserId == userId);
                return new ServiceResponse<int>
                {
                    Success = true,
                    Data = count,
                    Message = "Conversation count retrieved successfully"
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
    }
}
