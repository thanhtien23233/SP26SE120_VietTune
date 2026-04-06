using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class RagChatRepository : IRagChatRepository
    {
        private readonly DBContext _context;

        public RagChatRepository(DBContext context)
        {
            _context = context;
        }

        public async Task<QAConversation> CreateConversationAsync(Guid userId, string? title)
        {
            var conversation = new QAConversation
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = title,
                CreatedAt = DateTime.UtcNow
            };
            
            _context.QAConversations.Add(conversation);
            await _context.SaveChangesAsync();
            return conversation;
        }

        public async Task<List<QAConversation>> GetUserConversationsAsync(Guid userId)
        {
            return await _context.QAConversations
                .Where(c => c.UserId == userId)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
        }

        public async Task<QAConversation?> GetConversationWithMessagesAsync(Guid conversationId)
        {
            return await _context.QAConversations
                .Include(c => c.QAMessages!.OrderBy(m => m.CreatedAt))
                .FirstOrDefaultAsync(c => c.Id == conversationId);
        }

        public async Task DeleteConversationAsync(Guid conversationId)
        {
            var conversation = await _context.QAConversations
                .Include(c => c.QAMessages)
                .FirstOrDefaultAsync(c => c.Id == conversationId);
                
            if (conversation != null)
            {
                if (conversation.QAMessages != null && conversation.QAMessages.Any())
                {
                    _context.QAMessages.RemoveRange(conversation.QAMessages);
                }
                _context.QAConversations.Remove(conversation);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<QAMessage> AddMessageAsync(QAMessage message)
        {
            if (message.Id == Guid.Empty)
            {
                message.Id = Guid.NewGuid();
            }
            if (message.CreatedAt == default)
            {
                message.CreatedAt = DateTime.UtcNow;
            }
            
            _context.QAMessages.Add(message);
            await _context.SaveChangesAsync();
            return message;
        }

        public async Task<List<QAMessage>> GetConversationMessagesAsync(Guid conversationId, int limit = 50)
        {
            return await _context.QAMessages
                .Where(m => m.ConversationId == conversationId)
                .OrderByDescending(m => m.CreatedAt)
                .Take(limit)
                .OrderBy(m => m.CreatedAt) // Return in chronological order
                .ToListAsync();
        }

        public async Task<List<VectorEmbedding>> GetAllEmbeddingsAsync()
        {
            return await _context.VectorEmbeddings.ToListAsync();
        }

        public async Task SaveEmbeddingAsync(VectorEmbedding embedding)
        {
            var existing = await _context.VectorEmbeddings.FirstOrDefaultAsync(e => e.RecordingId == embedding.RecordingId);
            if (existing != null)
            {
                existing.EmbeddingJson = embedding.EmbeddingJson;
                existing.ModelVersion = embedding.ModelVersion;
                existing.CreatedAt = embedding.CreatedAt;
                _context.VectorEmbeddings.Update(existing);
            }
            else
            {
                if (embedding.Id == Guid.Empty) embedding.Id = Guid.NewGuid();
                _context.VectorEmbeddings.Add(embedding);
            }
            await _context.SaveChangesAsync();
        }
    }
}
