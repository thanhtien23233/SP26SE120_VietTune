You are implementing unit tests for the RAG Chat Flow in VietTuneArchive.Tests.
The backend is .NET 8 / ASP.NET Core. Test project is already scaffolded.

## CONTEXT — read these files first before writing any test
- VietTuneArchive.Application/Services/RagChatService.cs          ← PRIMARY
- VietTuneArchive.Application/IServices/IRagChatService.cs
- VietTuneArchive.Application/DTOs/RagChat/ (all files)
- VietTuneArchive.Domain/Entities/QAConversation.cs
- VietTuneArchive.Domain/Entities/QAMessage.cs
- VietTuneArchive.Domain/Enums/ (MessageRole, ConversationStatus, or equivalent)
- VietTuneArchive.Application/IRepositories/IQAConversationRepository.cs
- VietTuneArchive.Application/IRepositories/IQAMessageRepository.cs
- VietTuneArchive.Application/IServices/IKnowledgeRetrievalService.cs
- VietTuneArchive.Application/IServices/ILocalLlmService.cs
- VietTuneArchive.Application/IServices/IEmbeddingService.cs

RagChatService.SendMessageAsync has Crap Score 506 / Cyclomatic 22.
Read the full method, map every branch, then cover each path.

## TARGET FILE
VietTuneArchive.Tests/Unit/Services/RagChatServiceTests.cs

## TEST CASES TO IMPLEMENT

### Conversation Management
- CreateConversation: valid userId → conversation persisted, status = Active
- CreateConversation: null/empty userId → validation error
- GetConversations: returns only conversations belonging to requesting user
- GetConversations: other user's conversations → not returned
- GetConversationById: own conversation → returns full DTO
- GetConversationById: other user's conversation → forbidden error
- GetConversationById: non-existent id → not found error
- DeleteConversation: own conversation → soft/hard deleted per impl
- DeleteConversation: other user's conversation → forbidden error
- DeleteConversation: conversation with messages → cascaded or blocked per rule

### SendMessageAsync — Happy Path (Cyclomatic 22, cover each branch)
- Valid message → IKnowledgeRetrievalService.RetrieveAsync called with query
- Retrieval returns top-5 docs → context built with all 5
- Retrieval returns < 5 docs → context built with available docs only
- Retrieval returns 0 docs → LLM called with empty context (no crash)
- LLM generates response → QAMessage persisted with:
    role = Assistant, content = LLM output, conversationId correct,
    sourceReferences populated, confidenceScore set
- User message also persisted with role = User before LLM call
- Returns DTO with both user message and assistant response

### SendMessageAsync — Knowledge Retrieval Branches
- Retrieval includes KB entries → context contains KB content
- Retrieval includes Recording sources → context contains recording metadata
- Retrieval includes both KB + Recording → combined context passed to LLM
- Retrieval throws exception → graceful error, conversation not corrupted

### SendMessageAsync — LLM Interaction Branches
- LLM returns valid response → stored as-is
- LLM returns empty/null response → fallback message stored or error returned
- LLM throws exception → error returned, user message still persisted
- System prompt constructed correctly (contains context + user query)
- LLM called exactly once per SendMessage invocation

### SendMessageAsync — Source References
- Sources from retrieval are linked to assistant QAMessage
- Each source has: type (KB/Recording), referenceId, relevanceScore
- No sources available → message saved with empty source list
- Source recordingId references valid recording (mock repo)

### SendMessageAsync — Conversation State Checks
- Sending to non-existent conversationId → not found error
- Sending to deleted/closed conversation → rejected
- Sending to other user's conversation → forbidden error
- Empty/null message content → validation error
- Message exceeds max length (if rule exists) → rejected

### Expert Supervision
- FlagMessage: Expert flags incorrect AI response → message.IsFlagged = true
- FlagMessage: Non-expert flagging → forbidden (if role restricted)
- CorrectMessage: Expert provides correction → new message created with correction
- CorrectMessage: links to original flagged messageId
- UnflagMessage: Expert unflags → IsFlagged = false
- GetFlaggedMessages: returns only flagged messages for admin/expert

### Confidence Score
- High retrieval relevance → higher confidence score stored
- No retrieval results → low/zero confidence score stored
- Score is within valid range (0.0–1.0) if applicable

### Edge Cases
- Very long user message → handled without crash
- Special characters / Vietnamese diacritics in message → stored correctly
- Concurrent messages to same conversation (if lock exists) → handled
- Embedding service unavailable (if query embedded before retrieval) →
  fallback to keyword retrieval or error returned per impl

## IMPLEMENTATION RULES

1. Use xUnit + Moq + FluentAssertions only
2. Mock ALL dependencies:
   - IQAConversationRepository
   - IQAMessageRepository
   - IKnowledgeRetrievalService  ← mock RetrieveAsync to return test docs
   - ILocalLlmService            ← mock to return canned LLM response
   - IEmbeddingService           ← mock if query is embedded before retrieval
   - IUserRepository             ← for ownership checks
3. Arrange / Act / Assert with comments in each test
4. Naming: MethodName_Scenario_ExpectedResult
   Example: SendMessageAsync_WithValidInput_PersistsBothUserAndAssistantMessages
            SendMessageAsync_WhenLlmThrows_ReturnsErrorWithoutCorruptingConversation
            SendMessageAsync_WithZeroRetrievedDocs_StillCallsLlmWithEmptyContext
5. Group by nested classes:
   - ConversationManagement
   - SendMessage_HappyPath
   - SendMessage_RetrievalBranches
   - SendMessage_LlmInteraction
   - SendMessage_SourceReferences
   - SendMessage_ConversationStateChecks
   - ExpertSupervision
   - ConfidenceScore
   - EdgeCases
6. Create helpers in TestHelpers/:
   - QAConversationBuilder   → builds test conversation entity
   - QAMessageBuilder        → builds test message entity
   - RetrievalResultBuilder  → builds fake retrieval doc list
7. For LLM mock: mock returns deterministic string "Mocked LLM response"
   so assertions on stored content are predictable
8. If Result<T> pattern used, assert IsSuccess/IsFailure and payload
9. Verify mock call counts where critical:
   - IKnowledgeRetrievalService.RetrieveAsync → Times.Once
   - ILocalLlmService (send/complete method) → Times.Once
   - IQAMessageRepository.Add → Times.Exactly(2) for user + assistant

## AFTER ALL TESTS PASS

Run `dotnet test --filter "RagChatServiceTests"` — all must be green.
Fix any errors before proceeding.

Then create the report file at:
VietTuneArchive.Tests/Report/RAGCHAT_TEST_REPORT.md

Report must include:
- Date generated
- Total test count
- SendMessageAsync: branches identified (target 22) vs branches covered
- All test method names grouped by category
- Assumptions made:
    (LLM interface method name, retrieval doc schema,
     confidence score range, source reference model)
- Mock strategy for LLM and retrieval (document for team)
- Uncovered branches and reason
- Current estimated coverage delta for RagChatService after this phase
- Suggested integration test follow-ups
    (e.g., real LocalLlm call with WireMock, real vector retrieval)

Keep report concise — no fluff.