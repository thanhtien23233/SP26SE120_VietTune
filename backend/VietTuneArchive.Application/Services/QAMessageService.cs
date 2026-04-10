using AutoMapper;
using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class QAMessageService : GenericService<QAMessage, QAMessageDto>, IQAMessageService
    {
        private readonly IQAMessageRepository _messageRepository;
        private readonly IMapper _mapper;
        private readonly IQAConversationRepository _conversationRepository;
        public QAMessageService(IQAMessageRepository repository, IMapper mapper, IQAConversationRepository conversationRepository)
            : base(repository, mapper)
        {
            _messageRepository = repository ?? throw new ArgumentNullException(nameof(repository));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _conversationRepository = conversationRepository ?? throw new ArgumentNullException(nameof(conversationRepository));
        }
        public async Task<Result<bool>> UnflagMessageAsync(Guid messageId)
        {
            try
            {
                if (messageId == Guid.Empty)
                    throw new ArgumentException("Message id cannot be empty", nameof(messageId));
                var message = await _messageRepository.GetByIdAsync(messageId);
                if (message == null)
                    throw new ArgumentException("Message not found", nameof(messageId));
                message.FlaggedByExpert = false;
                await _messageRepository.UpdateAsync(message);
                return Result<bool>.Success(true, "Message flagged successfully");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure(ex.Message);
            }
        }
        public async Task<Result<bool>> FlagMessageAsync(Guid messageId)
        {
            try
            {
                if (messageId == Guid.Empty)
                    throw new ArgumentException("Message id cannot be empty", nameof(messageId));
                var message = await _messageRepository.GetByIdAsync(messageId);
                if (message == null)
                    throw new ArgumentException("Message not found", nameof(messageId));
                message.FlaggedByExpert = true;
                await _messageRepository.UpdateAsync(message);
                return Result<bool>.Success(true, "Message flagged successfully");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure(ex.Message);
            }
        }
        /// <summary>
        /// Get messages in a conversation
        /// </summary>
        public async Task<Result<IEnumerable<QAMessageDto>>> GetByConversationAsync(Guid conversationId)
        {
            try
            {
                if (conversationId == Guid.Empty)
                    throw new ArgumentException("Conversation id cannot be empty", nameof(conversationId));
                var conversationExists = await _conversationRepository.GetByIdAsync(conversationId);
                if (conversationExists == null)
                    throw new ArgumentException("Conversation not found", nameof(conversationId));
                var messages = await _messageRepository.GetAsync(m => m.ConversationId == conversationId);
                var dtos = _mapper.Map<List<QAMessageDto>>(messages.OrderBy(m => m.CreatedAt).ToList());
                return Result<IEnumerable<QAMessageDto>>.Success(dtos, $"Found {dtos.Count} messages");
            }
            catch (Exception ex)
            {
                return Result<IEnumerable<QAMessageDto>>.Failure(ex.Message);
            }
        }
        /// <summary>
        /// Get flagged messages
        /// </summary>
        public async Task<ServiceResponse<List<QAMessageDto>>> GetFlaggedMessagesAsync()
        {
            try
            {
                var messages = await _messageRepository.GetAsync(m => m.FlaggedByExpert);
                var dtos = _mapper.Map<List<QAMessageDto>>(messages.OrderByDescending(m => m.CreatedAt).ToList());
                return new ServiceResponse<List<QAMessageDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} flagged messages"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<QAMessageDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get messages by role (user/assistant)
        /// </summary>
        public async Task<ServiceResponse<List<QAMessageDto>>> GetByRoleAsync(Guid conversationId, int role)
        {
            try
            {
                if (conversationId == Guid.Empty)
                    throw new ArgumentException("Conversation id cannot be empty", nameof(conversationId));

                var messages = await _messageRepository.GetAsync(m =>
                    m.ConversationId == conversationId && m.Role == role);
                var dtos = _mapper.Map<List<QAMessageDto>>(messages.OrderBy(m => m.CreatedAt).ToList());
                return new ServiceResponse<List<QAMessageDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} messages"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<QAMessageDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get high confidence messages
        /// </summary>
        public async Task<ServiceResponse<List<QAMessageDto>>> GetHighConfidenceMessagesAsync(decimal minConfidence = 0.8m)
        {
            try
            {
                var messages = await _messageRepository.GetAsync(m =>
                    m.ConfidenceScore.HasValue && m.ConfidenceScore >= minConfidence);
                var dtos = _mapper.Map<List<QAMessageDto>>(messages.OrderByDescending(m => m.ConfidenceScore).ToList());
                return new ServiceResponse<List<QAMessageDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} high confidence messages"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<QAMessageDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get corrected messages (by expert)
        /// </summary>
        public async Task<ServiceResponse<List<QAMessageDto>>> GetCorrectedMessagesAsync(Guid expertId)
        {
            try
            {
                if (expertId == Guid.Empty)
                    throw new ArgumentException("Expert id cannot be empty", nameof(expertId));

                var messages = await _messageRepository.GetAsync(m =>
                    m.CorrectedByExpertId == expertId);
                var dtos = _mapper.Map<List<QAMessageDto>>(messages);
                return new ServiceResponse<List<QAMessageDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} corrected messages"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<QAMessageDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get average confidence for conversation
        /// </summary>
        public async Task<ServiceResponse<decimal>> GetAverageConfidenceAsync(Guid conversationId)
        {
            try
            {
                if (conversationId == Guid.Empty)
                    throw new ArgumentException("Conversation id cannot be empty", nameof(conversationId));

                var messages = await _messageRepository.GetAsync(m =>
                    m.ConversationId == conversationId && m.ConfidenceScore.HasValue);

                var averageConfidence = messages.Any()
                    ? messages.Average(m => m.ConfidenceScore!.Value)
                    : 0;

                return new ServiceResponse<decimal>
                {
                    Success = true,
                    Data = averageConfidence,
                    Message = "Average confidence retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<decimal>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get message count in conversation
        /// </summary>
        public async Task<ServiceResponse<int>> GetMessageCountAsync(Guid conversationId)
        {
            try
            {
                if (conversationId == Guid.Empty)
                    throw new ArgumentException("Conversation id cannot be empty", nameof(conversationId));

                var count = await _messageRepository.CountAsync(m => m.ConversationId == conversationId);
                return new ServiceResponse<int>
                {
                    Success = true,
                    Data = count,
                    Message = "Message count retrieved successfully"
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
