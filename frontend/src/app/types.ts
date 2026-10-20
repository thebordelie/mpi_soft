export type UserRole = 'organizer' | 'customer' | 'architect' | 'chemist' | 'impersonator' | 'extractor';

export type RequestGoal = 'inception' | 'extraction' | 'research' | 'training';
export type RequestStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface OperationRequest {
  id: string;
  status: RequestStatus;
  name: string;
  description: string;
  plannedDate: string;
  targetFullName: string;
  targetBirthDate: string;
  targetDescription: string;
  targetBehavior: string;
  goal: RequestGoal | '';
  desiredResult: string;
  successCriteria: string;
  organization: string;
  organizerLogin: string;
  rejectionReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  login: string;
  fullName: string;
  role: UserRole;
  password?: string;
}

export interface AuthUser {
  login: string;
  fullName: string;
  role: UserRole;
  roleName: string;
}

export interface AuthSession {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
  privileges: string[];
}

export interface OperationTarget {
  fullName: string;
  birthDate: string;
  description: string;
}

export interface OperationCustomer {
  fullName: string;
  company: string;
}

export interface Operation {
  id: string;
  name: string;
  status: 'draft' | 'planning' | 'active' | 'ready' | 'launch' | 'running' | 'completed' | 'cancelled';
  target: OperationTarget;
  customer: OperationCustomer;
  date: string;
  successCriteria: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LogEvent {
  id: string;
  operationId: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

export type NotificationType =
  | 'request_submitted'
  | 'request_approved'
  | 'request_rejected'
  | 'operation_participant_added';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
}

export type ParticipantRole = 'architect' | 'chemist' | 'impersonator' | 'extractor';

export interface Participant {
  id: string;
  login: string;
  name: string;
  role: ParticipantRole;
}

export interface KeyEvent {
  id: string;
  name: string;
  description: string;
  participantIds: string[];
}

export interface DreamLevel {
  id: string;
  name: string;
  description: string;
  goal: string;
  parentLevelId: string | null;
  participantIds: string[];
  keyEvents: KeyEvent[];
}
