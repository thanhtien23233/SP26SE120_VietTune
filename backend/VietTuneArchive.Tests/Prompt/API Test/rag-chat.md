You are implementing API integration tests for the RAG Chat flow in VietTuneArchive.Tests.
Infrastructure (WebAppFactory, JwtTokenHelper, ApiTestBase, DatabaseFixture) is
already set up. Do NOT modify any fixture files unless absolutely required.

## CONTEXT — read these files first before writing any test
- VietTuneArchive.API/Controllers/RagChatController.cs          ← routes, auth roles
- VietTuneArchive.Application/Services/RagChatService.cs        ← business rules
- VietTuneArchive.Application/DTOs/RagChat/ (all files)         ← request/response shape
- VietTuneArchive.Domain/Entities/QAConversation.cs
- VietTuneArchive.Domain/Entities/QAMessage.cs
- VietTuneArchive.Domain/Enums/ (MessageRole, ConversationStatus, or equivalent)
- VietTuneArchive.Application/IServices/ILocalLlmService.cs     ← stubbed in WebAppFactory
- VietTuneArchive.Application/IServices/IKnowledgeRetrievalService.cs ← stubbed
- VietTuneArchive.Tests/Integration/Fixtures/                   ← all fixture files

Confirm exact route paths, DTO field names, role restrictions,
and LLM/retrieval stub behavior before writing any test.

## TARGET FILE
VietTuneArchive.Tests/Integration/Controllers/RagChatControllerTests.cs

## BASE CLASS
Inherit ApiTestBase. Use JwtTokenHelper for role tokens.
ILocalLlmService and IKnowledgeRetrievalService are stubbed in WebAppFactory
to return deterministic responses — do NOT call real LLM or vector DB.

---

## TEST CASES

### POST /api/rag-chat/conversations
- Valid request [Authenticated] → 201, conversationId returned
- [Admin] → 201
- [Expert] → 201
- [Contributor] → 201
- [Researcher] → 201
- Unauthenticated → 401
- Missing/null title (if required) → 400
- After create → QAConversation persisted in DB with:
    userId = requesting user, status = Active, createdAt set
- Two users create conversations → each only sees their own (verified in GET)

### GET /api/rag-chat/conversations
- [Authenticated user] → 200, returns only own conversations
- Other user's conversations NOT included in response
- Empty conversation list → 200 empty list, not error
- Unauthenticated → 401
- Pagination respected (page/size params)
- Response contains: id, title, createdAt, messageCount (if in DTO)

### GET /api/rag-chat/conversations/{id}
- Own conversation [Authenticated] → 200, full detail with messages
- Another user's conversationId → 403 or 404 per impl
- Non-existent id → 404
- Unauthenticated → 401
- Response contains: conversationId, messages array (may be empty on new convo)

### DELETE /api/rag-chat/conversations/{id}
- Own conversation → 204, removed or soft-deleted from DB
- Another user's conversationId → 403
- Non-existent id → 404
- Unauthenticated → 401
- After delete → GET same id returns 404
- After delete → messages cascade deleted or hidden

### POST /api/rag-chat/conversations/{id}/messages
- Valid message [Authenticated] → 200, response contains assistant reply
- Unauthenticated → 401
- Non-existent conversationId → 404
- Another user's conversationId → 403
- Deleted/closed conversation → 400
- Empty/null message content → 400
- After send → DB contains TWO new QAMessages:
    one with role = User (content = input)
    one with role = Assistant (content = stub LLM response)
- Assistant message contains sourceReferences array (may be empty)
- Assistant message contains confidenceScore field
- IKnowledgeRetrievalService stub called → verify via spy
- ILocalLlmService stub called → verify via spy
- Stub LLM response text appears in assistant message content

### Message Persistence Deep Assert
For one SendMessage test, assert full DB state:
- QAMessage (User): role, content, conversationId, createdAt
- QAMessage (Assistant): role, content, conversationId, createdAt,
  sourceReferences (array), confidenceScore (numeric)
- Conversation.UpdatedAt refreshed after message sent
- Message ordering: User message before Assistant in DB

### LLM Stub Resilience
- Configure WebAppFactory LLM stub to throw on one test →
  verify response is 500 or appropriate error code
- Assert User message still persisted in DB despite LLM failure
  (fire-and-forget resilience — if impl supports it)
- Assert conversation not left in corrupted state (can still send next message)

### Retrieval Stub Behavior
- Configure retrieval stub to return 0 docs →
  message still sent successfully, sourceReferences = empty array
- Configure retrieval stub to return 3 docs →
  assistant message sourceReferences has 3 items
- Each source reference contains: type, referenceId, relevanceScore

---

### Admin Embedding Endpoints
### POST /api/rag-chat/embeddings/backfill
- [Admin] → 200 or 202 (accepted)
- [Expert] → 403
- [Contributor] → 403
- Unauthenticated → 401

### POST /api/rag-chat/embeddings/backfill-768
- [Admin] → 200 or 202
- [Expert] → 403
- Unauthenticated → 401

### POST /api/rag-chat/embeddings/regenerate/{recordingId}
- Valid recordingId [Admin] → 200
- Non-existent recordingId → 404
- [Expert] → 403
- Unauthenticated → 401

### POST /api/rag-chat/embeddings/generate/{recordingId}
- Valid recordingId [Admin] → 200
- Non-existent recordingId → 404
- [Expert] → 403
- Unauthenticated → 401

---

## IMPLEMENTATION RULES

1. Inherit ApiTestBase — use PostAsync<T>, GetAsync, DeleteAsync helpers
2. Each test fully independent:
   - Create fresh conversation per test via POST conversations
   - Use unique userId per test (seeded users from DatabaseFixture)
   - Never share conversation state between tests
3. LLM and retrieval stubs:
   - ILocalLlmService stub → always returns "Mocked LLM response"
   - IKnowledgeRetrievalService stub → returns configurable doc list
   - Expose stubs from WebAppFactory so tests can:
     (a) reconfigure return values per test
     (b) call Verify() to assert invocation counts
4. For DB state assertions:
   - Resolve AppDbContext from WebAppFactory.Services scope
   - Query QAMessages, QAConversations directly after API calls
5. Naming: Endpoint_Scenario_ExpectedResult
   Example: CreateConversation_Unauthenticated_Returns401
            SendMessage_ToAnotherUsersConversation_Returns403
            SendMessage_WithValidInput_PersistsBothUserAndAssistantMessages
            SendMessage_WhenLlmThrows_UserMessageStillPersistedInDb
            SendMessage_WithZeroRetrievedDocs_ReturnsEmptySourceReferences
6. Group by nested classes:
   - CreateConversationTests
   - GetConversationsTests
   - GetConversationByIdTests
   - DeleteConversationTests
   - SendMessageTests
   - MessagePersistenceTests
   - LlmResilienceTests
   - RetrievalBehaviorTests
   - EmbeddingEndpointTests
7. Shared helper within test class:
   - CreateConversation(string token) → POST, returns conversationId
   - SendMessage(Guid convId, string content, string token)
     → POST messages, returns response DTO
8. Assert response body shape for SendMessage:
   var body = await response.Content.ReadFromJsonAsync<SendMessageResponseDto>();
   body.UserMessage.Content.Should().Be("test input");
   body.AssistantMessage.Content.Should().Be("Mocked LLM response");
   body.AssistantMessage.SourceReferences.Should().NotBeNull();
   body.AssistantMessage.ConfidenceScore.Should().BeInRange(0.0, 1.0);
9. For LLM resilience test:
   - Use WebAppFactory.LlmServiceMock.Setup(...).Throws<Exception>()
   - Wrap in try/catch at test level if needed
   - Reset mock to normal behavior after test (use IDisposable or fixture reset)

## VERIFICATION
Run: dotnet test --filter "RagChatControllerTests"
All tests must be green. Fix errors before proceeding.

Check coverage delta:
- RagChatController → ≥ 80% line coverage
- RagChatService.SendMessageAsync branches gain additional coverage
  (combined with unit tests, target ≥ 65% branch on this method)

## REPORT
Create: VietTuneArchive.Tests/Report/RAGCHAT_API_TEST_REPORT.md

Include:
- Date generated
- Total tests written, pass/fail count
- All test method names grouped by category
- Route paths confirmed (list all 9 endpoints)
- LLM stub configuration approach (how return value / exception configured per test)
- Retrieval stub configuration approach (how doc count varied per test)
- DB assertion targets (QAMessage fields asserted)
- Message persistence fields verified (list all fields checked)
- Role permission matrix:
  (Role × Endpoint → Allowed/Forbidden)
- Helper methods created (list signatures)
- Uncovered scenarios and reason
- Estimated RagChatController + RagChatService coverage delta
- Deferred cases:
  (real vector retrieval integration, SignalR streaming if applicable,
   conversation history context window test)

Keep concise — no fluff.