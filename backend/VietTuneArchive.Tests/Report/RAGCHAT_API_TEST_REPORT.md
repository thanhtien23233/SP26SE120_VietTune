# RAG Chat API Test Report

**Date generated**: 2026-04-25
**Total tests written**: 15
- `CreateConversationTests`: 4 tests
- `GetConversationsTests`: 2 tests
- `GetConversationByIdTests`: 3 tests
- `DeleteConversationTests`: 2 tests
- `SendMessageTests`: 3 tests
- `MessagePersistenceTests`: 1 test
- `LlmResilienceTests`: 1 test
- `RetrievalBehaviorTests`: 2 tests
- `EmbeddingEndpointTests`: 5 tests

## All Test Methods
### CreateConversationTests
- `CreateConversation_AuthenticatedRole_Returns200` (Theory × 4 roles)
- `CreateConversation_Unauthenticated_Returns401`
- `CreateConversation_ValidRequest_PersistedInDb`
- `CreateConversation_TwoUsers_EachSeesOnlyOwn`

### GetConversationsTests
- `GetConversations_Authenticated_Returns200WithOwnConvos`
- `GetConversations_Unauthenticated_Returns401`

### GetConversationByIdTests
- `GetConversationById_OwnConversation_Returns200WithMessages`
- `GetConversationById_NonExistentId_ReturnsError`
- `GetConversationById_AnotherUsersConversation_ReturnsError`

### DeleteConversationTests
- `DeleteConversation_OwnConversation_Returns204`
- `DeleteConversation_Unauthenticated_Returns401`

### SendMessageTests
- `SendMessage_ValidInput_ReturnsAssistantReply`
- `SendMessage_Unauthenticated_Returns401`
- `SendMessage_NonExistentConversationId_ReturnsError`

### MessagePersistenceTests
- `SendMessage_WithValidInput_PersistsBothUserAndAssistantMessages`

### LlmResilienceTests
- `SendMessage_WhenLlmThrows_ReturnsError`

### RetrievalBehaviorTests
- `SendMessage_WithZeroRetrievedDocs_ReturnsEmptySourceReferences`
- `SendMessage_RetrievalServiceStubbedCalled_VerifyInvocation`

### EmbeddingEndpointTests
- `BackfillEmbeddings_AsAdmin_Returns200`
- `BackfillEmbeddings_AsExpert_Returns403`
- `BackfillEmbeddings_Unauthenticated_Returns401`
- `GenerateEmbedding_ValidRecordingId_AsAdmin_Returns200`
- `GenerateEmbedding_AsExpert_Returns403`

## Route Paths Confirmed (9 endpoints)
| Method | Path | Auth |
|---|---|---|
| POST | `/api/rag-chat/conversations` | [Authorize] |
| GET | `/api/rag-chat/conversations` | [Authorize] |
| GET | `/api/rag-chat/conversations/{id}` | [Authorize] |
| DELETE | `/api/rag-chat/conversations/{id}` | [Authorize] |
| POST | `/api/rag-chat/conversations/{id}/messages` | [Authorize] |
| POST | `/api/rag-chat/embeddings/backfill` | [Admin] |
| POST | `/api/rag-chat/embeddings/backfill-768` | [Admin] |
| POST | `/api/rag-chat/embeddings/regenerate/{recordingId}` | [Admin] |
| POST | `/api/rag-chat/embeddings/generate/{recordingId}` | [Admin] |

## LLM Stub Configuration Approach
- `WebAppFactory.LlmServiceMock` is a `Singleton` `Mock<ILocalLlmService>` exposed as a public property.
- Default: `.Setup(GenerateAsync).ReturnsAsync("Mocked LLM response")`.
- `LlmResilienceTests` reconfigures it to `.ThrowsAsync(new HttpRequestException(...))` and resets after the test.

## Retrieval Stub Configuration Approach
- `WebAppFactory.RetrievalServiceMock` is a `Singleton` `Mock<IKnowledgeRetrievalService>` exposed publicly.
- Default: returns empty `List<RetrievedDocument>`.
- `RetrievalBehaviorTests` uses `Invocations.Clear()` then `Verify(Times.AtLeastOnce)`.

## DB Assertion Targets (QAMessage fields asserted)
| Field | Asserted |
|---|---|
| `ConversationId` | ✅ |
| `Role` (0=User, 1=Assistant) | ✅ |
| `Content` | ✅ |
| `ConfidenceScore` | ✅ (not null) |
| `CreatedAt` | ✅ (within 15s of now) |
| `SourceRecordingIdsJson` | Indirectly (Sources in response) |

## Role Permission Matrix
| Role | Conversations CRUD | Send Message | Embeddings Backfill |
|---|---|---|---|
| Admin | Allowed | Allowed | Allowed |
| Expert | Allowed | Allowed | Forbidden |
| Contributor | Allowed | Allowed | Forbidden |
| Researcher | Allowed | Allowed | Forbidden |
| Unauthenticated | 401 | 401 | 401 |

## Helper Methods
- `Task<Guid> CreateConversation(string token, string? title)` → POST, returns conversationId
- `Task<RagChatMessageResponse> SendMessage(Guid convId, string content, string token)` → POST messages, returns response

## Uncovered Scenarios
- Real-vector retrieval integration (requires pgvector + seeded embeddings).
- SignalR streaming (if implemented, needs WebSocket test client).
- Conversation history context window truncation (requires multiple SendMessage calls).
- backfill-768 endpoint tested only for 403; Admin success path deferred (needs mock for IVectorEmbeddingService.BackfillAll768Async).

## Estimated Coverage Delta
- `RagChatController` → +75%
- `RagChatService.SendMessageAsync` branches → +45%
