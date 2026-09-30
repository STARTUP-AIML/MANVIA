import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AIAuthGuard } from '../guards/ai-auth.guard.js';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { AICompanionService } from '../services/ai-companion.service.js';
import { AIMemoryService } from '../memory/ai-memory.service.js';
import { AIRealtimeService } from '../realtime/ai-realtime.service.js';
import { AIHandoffService } from '../handoff/ai-handoff.service.js';
import { AISafetyService } from '../safety/ai-safety.service.js';
import { MedicalRAGService, type MedicalRAGResult } from '../rag/medical-rag.service.js';
import {
  AIConversationDetailResponseDto,
  AIConversationQueryDto,
  AIConversationResponseDto,
  AIFeedbackResponseDto,
  CreateAIConversationDto,
  PaginatedAIConversationsResponseDto,
  SendAIMessageDto,
  SendAIMessageResponseDto,
  SubmitAIFeedbackDto,
} from '../dto/index.js';
import { CreateAIMemoryDto } from '../memory/dto/create-memory.dto.js';
import { AIMemoryResponseDto } from '../memory/dto/ai-memory-response.dto.js';
import { CreateAIRealtimeSessionDto } from '../realtime/dto/create-realtime-session.dto.js';
import { AIRealtimeSessionResponseDto } from '../realtime/dto/realtime-session-response.dto.js';
import { RealtimeTransitionDto } from '../realtime/dto/realtime-transition.dto.js';
import { RequestAIHandoffDto } from '../handoff/dto/request-handoff.dto.js';
import { AIHandoffResponseDto } from '../handoff/dto/handoff-response.dto.js';
import { EvaluateSafetyDto } from '../safety/dto/evaluate-safety.dto.js';
import { RetrieveEvidenceDto } from '../rag/dto/retrieve-evidence.dto.js';

@ApiTags('AI Companion Core & Advanced Capabilities')
@Controller('ai')
@UseGuards(AIAuthGuard)
@ApiBearerAuth('bearer-auth')
export class AICompanionController {
  constructor(
    private readonly companionService: AICompanionService,
    private readonly memoryService: AIMemoryService,
    private readonly realtimeService: AIRealtimeService,
    private readonly handoffService: AIHandoffService,
    private readonly safetyService: AISafetyService,
    private readonly ragService: MedicalRAGService,
  ) {}

  // ============================================================================
  // Phase 15: Conversation & Message Management
  // ============================================================================

  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new AI companion conversation session',
    description:
      'Initializes an authenticated conversational session with the MANVIA AI Companion. ' +
      'Every session is private to the owner and clearly disclosed as non-clinical artificial intelligence.',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
    type: AIConversationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  public async createConversation(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CreateAIConversationDto,
  ): Promise<AIConversationResponseDto> {
    return this.companionService.createConversation(user.userId, dto);
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'List user AI conversations',
    description:
      'Returns a paginated list of active or archived conversations owned by the caller. ' +
      'Strict user isolation ensures users can only inspect their own sessions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversations listed successfully',
    type: PaginatedAIConversationsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  public async listConversations(
    @CurrentUser() user: CurrentUserContext,
    @Query() query: AIConversationQueryDto,
  ): Promise<PaginatedAIConversationsResponseDto> {
    return this.companionService.listConversations(user.userId, query);
  }

  @Get('conversations/:conversationId')
  @ApiOperation({
    summary: 'Get conversation details and message history',
    description:
      'Fetches details of an AI conversation along with chronological message history. ' +
      'Enforces strict user ownership; cross-user access is denied.',
  })
  @ApiParam({
    name: 'conversationId',
    description: 'Internal UUID or public identifier (e.g., AIC-XXXXXXXX)',
    example: 'AIC-7X9B2K5M',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation details retrieved successfully',
    type: AIConversationDetailResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this conversation' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  public async getConversation(
    @CurrentUser() user: CurrentUserContext,
    @Param('conversationId') conversationId: string,
  ): Promise<AIConversationDetailResponseDto> {
    return this.companionService.getConversation(conversationId, user.userId);
  }

  @Delete('conversations/:conversationId')
  @ApiOperation({
    summary: 'Delete or archive an AI conversation',
    description:
      'Soft-deletes or archives an AI conversation session owned by the authenticated user.',
  })
  @ApiParam({
    name: 'conversationId',
    description: 'Internal UUID or public identifier (e.g., AIC-XXXXXXXX)',
    example: 'AIC-7X9B2K5M',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this conversation' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  public async deleteConversation(
    @CurrentUser() user: CurrentUserContext,
    @Param('conversationId') conversationId: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.companionService.deleteConversation(conversationId, user.userId);
  }

  @Post('conversations/:conversationId/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send message to AI Companion and receive assistant response',
    description:
      'Submits a text message to the AI Companion within an owned session. ' +
      'Orchestrates context preparation, medical RAG, safety pre-checks, non-clinical AI model generation, and response persistence. ' +
      'Responses are explicitly marked with AI disclosure notices and token/latency metadata.',
  })
  @ApiParam({
    name: 'conversationId',
    description: 'Internal UUID or public identifier (e.g., AIC-XXXXXXXX)',
    example: 'AIC-7X9B2K5M',
  })
  @ApiResponse({
    status: 200,
    description: 'User message recorded and AI assistant response generated',
    type: SendAIMessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed or conversation is not active' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this conversation' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 500, description: 'AI provider service temporarily unavailable' })
  public async sendMessage(
    @CurrentUser() user: CurrentUserContext,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendAIMessageDto,
    @Headers('x-correlation-id') correlationId?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<SendAIMessageResponseDto> {
    return this.companionService.sendMessage(
      conversationId,
      user.userId,
      dto,
      correlationId ?? requestId,
    );
  }

  @Post('messages/:messageId/feedback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit feedback on an AI assistant response',
    description:
      'Records user sentiment rating (POSITIVE or NEGATIVE) and optional comment for an AI response. ' +
      'Users can only evaluate responses belonging to conversations they own.',
  })
  @ApiParam({
    name: 'messageId',
    description: 'Internal UUID or public identifier (e.g., AIM-XXXXXXXX)',
    example: 'AIM-4T6M8P9Q',
  })
  @ApiResponse({
    status: 200,
    description: 'Feedback recorded successfully',
    type: AIFeedbackResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed or message is not an AI response' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied: Message belongs to another user' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  public async submitFeedback(
    @CurrentUser() user: CurrentUserContext,
    @Param('messageId') messageId: string,
    @Body() dto: SubmitAIFeedbackDto,
  ): Promise<AIFeedbackResponseDto> {
    return this.companionService.submitFeedback(messageId, user.userId, dto);
  }

  // ============================================================================
  // Phase 16: AI Memory Management
  // ============================================================================

  @Post('memories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create or update user-approved long-term memory',
    description:
      'Stores a controlled, non-sensitive communication preference or wellness goal for personalization. ' +
      'Sensitive medical facts are never persisted automatically. Strictly isolated per user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Memory stored successfully',
    type: AIMemoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  public async createMemory(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CreateAIMemoryDto,
  ): Promise<AIMemoryResponseDto> {
    return this.memoryService.createMemory(user.userId, dto);
  }

  @Get('memories')
  @ApiOperation({
    summary: 'List user active memories',
    description:
      'Returns active preferences and non-clinical personalization memories for the caller.',
  })
  @ApiResponse({
    status: 200,
    description: 'Memories retrieved successfully',
    type: [AIMemoryResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  public async listMemories(
    @CurrentUser() user: CurrentUserContext,
  ): Promise<AIMemoryResponseDto[]> {
    return this.memoryService.listMemories(user.userId);
  }

  @Delete('memories/:memoryId')
  @ApiOperation({
    summary: 'Delete user memory',
    description: 'Allows users to explicitly delete and revoke an active memory item.',
  })
  @ApiParam({
    name: 'memoryId',
    description: 'Internal UUID or public memory ID (e.g., MEM-XXXXXXXX)',
    example: 'MEM-8A4C2E9F',
  })
  @ApiResponse({ status: 200, description: 'Memory deleted successfully' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this memory' })
  @ApiResponse({ status: 404, description: 'Memory not found' })
  public async deleteMemory(
    @CurrentUser() user: CurrentUserContext,
    @Param('memoryId') memoryId: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.memoryService.deleteMemory(user.userId, memoryId);
  }

  // ============================================================================
  // Phase 16: Safety & Medical RAG Inspection
  // ============================================================================

  @Post('safety/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run AI safety check and classification',
    description:
      'Evaluates text through the safety rule classifier and provides emergency routing advice if indicated.',
  })
  @ApiResponse({ status: 200, description: 'Safety check evaluated' })
  public async checkSafety(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: EvaluateSafetyDto,
  ) {
    return this.safetyService.evaluatePreCheck({
      userId: user.userId,
      text: dto.text,
      locale: dto.locale,
    });
  }

  @Post('rag/retrieve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Query medical guidelines knowledge base',
    description: 'Retrieves synthetic or verified medical reference chunks with citation metadata.',
  })
  @ApiResponse({ status: 200, description: 'Evidence chunks retrieved' })
  public async retrieveEvidence(
    @CurrentUser() _user: CurrentUserContext,
    @Body() dto: RetrieveEvidenceDto,
  ): Promise<MedicalRAGResult> {
    return this.ragService.retrieveEvidence(dto.query);
  }

  // ============================================================================
  // Phase 17: Realtime Voice & Session Management
  // ============================================================================

  @Post('realtime/session')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Initialize authenticated realtime voice session',
    description:
      'Creates a short-lived realtime session with connection tokens and capability negotiation. Never exposes master secrets.',
  })
  @ApiResponse({
    status: 201,
    description: 'Realtime session created successfully',
    type: AIRealtimeSessionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  public async createRealtimeSession(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CreateAIRealtimeSessionDto,
  ): Promise<AIRealtimeSessionResponseDto> {
    return this.realtimeService.createSession(user.userId, dto);
  }

  @Get('realtime/session/:sessionId')
  @ApiOperation({
    summary: 'Get realtime session status and state',
    description: 'Fetches the current state machine state, metrics, and details for a session.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Internal UUID or public session ID (e.g., RTS-XXXXXXXX)',
    example: 'RTS-8A2D4F6E',
  })
  @ApiResponse({
    status: 200,
    description: 'Session status retrieved',
    type: AIRealtimeSessionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this realtime session' })
  @ApiResponse({ status: 404, description: 'Realtime session not found' })
  public async getRealtimeSession(
    @CurrentUser() user: CurrentUserContext,
    @Param('sessionId') sessionId: string,
  ): Promise<AIRealtimeSessionResponseDto> {
    return this.realtimeService.getSession(user.userId, sessionId);
  }

  @Post('realtime/session/:sessionId/transition')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transition realtime session state',
    description:
      'Applies explicit state transitions (e.g. IDLE -> LISTENING -> PROCESSING -> SPEAKING -> INTERRUPTED).',
  })
  @ApiParam({ name: 'sessionId', example: 'RTS-8A2D4F6E' })
  @ApiResponse({
    status: 200,
    description: 'State transition applied',
    type: AIRealtimeSessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid state machine transition' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this realtime session' })
  public async transitionRealtimeSession(
    @CurrentUser() user: CurrentUserContext,
    @Param('sessionId') sessionId: string,
    @Body() dto: RealtimeTransitionDto,
  ): Promise<AIRealtimeSessionResponseDto> {
    return this.realtimeService.transitionState(user.userId, sessionId, dto.state);
  }

  @Post('realtime/session/:sessionId/interrupt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Barge-in interruption of active assistant speech',
    description:
      'Signals user interruption to cancel upstream audio streaming and transition to INTERRUPTED.',
  })
  @ApiParam({ name: 'sessionId', example: 'RTS-8A2D4F6E' })
  @ApiResponse({ status: 200, description: 'Barge-in interruption executed' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this realtime session' })
  public async interruptRealtimeSession(
    @CurrentUser() user: CurrentUserContext,
    @Param('sessionId') sessionId: string,
  ): Promise<{ interrupted: boolean; latencyMs: number }> {
    return this.realtimeService.interruptSession(user.userId, sessionId);
  }

  @Post('realtime/session/:sessionId/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Terminate realtime voice session',
    description: 'Closes active connection channels and transitions session to ENDED.',
  })
  @ApiParam({ name: 'sessionId', example: 'RTS-8A2D4F6E' })
  @ApiResponse({ status: 200, description: 'Session terminated' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this realtime session' })
  public async endRealtimeSession(
    @CurrentUser() user: CurrentUserContext,
    @Param('sessionId') sessionId: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.realtimeService.endSession(user.userId, sessionId);
  }

  // ============================================================================
  // Phase 17: Human Clinician Handoff
  // ============================================================================

  @Post('handoffs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Request human clinician handoff from AI conversation',
    description:
      'Creates a structured handoff request. Does not silently auto-book or bypass existing consent/doctor rules.',
  })
  @ApiResponse({
    status: 201,
    description: 'Handoff requested successfully',
    type: AIHandoffResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  public async requestHandoff(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: RequestAIHandoffDto,
  ): Promise<AIHandoffResponseDto> {
    return this.handoffService.requestHandoff(user.userId, dto);
  }

  @Get('handoffs')
  @ApiOperation({
    summary: 'List user handoff requests',
    description: 'Returns all pending or past handoff requests initiated by the caller.',
  })
  @ApiResponse({
    status: 200,
    description: 'Handoffs retrieved',
    type: [AIHandoffResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  public async listUserHandoffs(
    @CurrentUser() user: CurrentUserContext,
  ): Promise<AIHandoffResponseDto[]> {
    return this.handoffService.listUserHandoffs(user.userId);
  }

  @Get('handoffs/:handoffId')
  @ApiOperation({
    summary: 'Get handoff request details',
    description: 'Retrieves status and metadata of a specific handoff request.',
  })
  @ApiParam({
    name: 'handoffId',
    description: 'Internal UUID or public handoff ID (e.g. AIH-XXXXXXXX)',
    example: 'AIH-4P8M2K9Q',
  })
  @ApiResponse({
    status: 200,
    description: 'Handoff details retrieved',
    type: AIHandoffResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this handoff request' })
  @ApiResponse({ status: 404, description: 'Handoff request not found' })
  public async getHandoff(
    @CurrentUser() user: CurrentUserContext,
    @Param('handoffId') handoffId: string,
  ): Promise<AIHandoffResponseDto> {
    return this.handoffService.getUserHandoff(user.userId, handoffId);
  }

  @Post('handoffs/:handoffId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel pending handoff request',
    description: 'Cancels a requested or queued handoff before doctor acceptance.',
  })
  @ApiParam({ name: 'handoffId', example: 'AIH-4P8M2K9Q' })
  @ApiResponse({
    status: 200,
    description: 'Handoff cancelled successfully',
    type: AIHandoffResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Cannot cancel completed handoff' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this handoff request' })
  public async cancelHandoff(
    @CurrentUser() user: CurrentUserContext,
    @Param('handoffId') handoffId: string,
  ): Promise<AIHandoffResponseDto> {
    return this.handoffService.cancelHandoff(user.userId, handoffId);
  }

  @Get('doctor/handoffs')
  @ApiOperation({
    summary: 'Doctor queue: View pending handoff requests',
    description:
      'Allows verified healthcare providers to query the triage queue for unassigned patient handoffs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending handoffs retrieved',
    type: [AIHandoffResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Doctor role and verification required' })
  public async listDoctorPendingHandoffs(
    @CurrentUser() user: CurrentUserContext,
  ): Promise<AIHandoffResponseDto[]> {
    return this.handoffService.listPendingHandoffsForDoctor(user.userId);
  }

  @Post('doctor/handoffs/:handoffId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Doctor: Accept patient handoff',
    description:
      'Assigns the requesting patient handoff to the authenticated verified doctor and transitions status to ACCEPTED.',
  })
  @ApiParam({ name: 'handoffId', example: 'AIH-4P8M2K9Q' })
  @ApiResponse({
    status: 200,
    description: 'Handoff accepted by clinician',
    type: AIHandoffResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Handoff already accepted or cancelled' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Doctor role and verification required' })
  public async acceptDoctorHandoff(
    @CurrentUser() user: CurrentUserContext,
    @Param('handoffId') handoffId: string,
  ): Promise<AIHandoffResponseDto> {
    return this.handoffService.acceptHandoff(user.userId, handoffId);
  }
}
