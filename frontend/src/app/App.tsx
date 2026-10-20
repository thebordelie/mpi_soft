import { useEffect, useState, useCallback } from 'react';
import { OperationList } from './components/OperationList';
import { OperationEditor } from './components/OperationEditor';
import { OperationDetail } from './components/OperationDetail';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { Operation, User, UserRole, Participant, AuthSession } from './types';
import { RequestsTab } from './components/RequestsTab';
import { NotificationsTab } from './components/NotificationsTab';
import { meRequest } from './api/auth';
import { fetchOperations, toOperation, toParticipants, updateOperation } from './api/operations';
import { changeOperationStatus } from './api/planning';
import { fetchUnreadCount } from './api/notifications';
import { clearSession, hasPrivilege, loadSession, saveSession } from './auth/session';
import { ApiError } from './api/client';
import {
  Container, Box, Typography, AppBar, Toolbar, Chip, Button,
  Dialog, DialogContent, DialogTitle, IconButton, Tabs, Tab, CircularProgress, Badge, Alert,
} from '@mui/material';
import { Logout, Close } from '@mui/icons-material';

type AuthScreen = 'login' | 'register' | 'app';

const ROLE_LABELS: Record<UserRole, string> = {
  organizer: 'Организатор',
  customer: 'Заказчик',
  architect: 'Архитектор',
  chemist: 'Химик',
  impersonator: 'Имперсонатор',
  extractor: 'Извлекатель',
};

function sessionToUser(session: AuthSession): User {
  return {
    login: session.user.login,
    fullName: session.user.fullName,
    role: session.user.role,
  };
}

export default function App() {
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    const stored = loadSession();
    if (!stored) {
      setBootstrapping(false);
      return;
    }

    meRequest(stored.accessToken)
      .then((me) => {
        const restored: AuthSession = {
          ...stored,
          user: me.user,
          privileges: me.privileges,
        };
        saveSession(restored);
        setSession(restored);
        setAuthScreen('app');
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => {
        setBootstrapping(false);
      });
  }, []);

  const handleAuthSuccess = (newSession: AuthSession) => {
    saveSession(newSession);
    setSession(newSession);
    setAuthScreen('app');
  };

  const handleLogout = () => {
    if (confirm('Вы уверены, что хотите выйти из системы?')) {
      clearSession();
      setSession(null);
      setAuthScreen('login');
    }
  };

  if (bootstrapping) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (authScreen === 'login') {
    return (
      <LoginPage
        onSuccess={handleAuthSuccess}
        onGoRegister={() => setAuthScreen('register')}
      />
    );
  }

  if (authScreen === 'register') {
    return (
      <RegisterPage
        onSuccess={handleAuthSuccess}
        onGoLogin={() => setAuthScreen('login')}
      />
    );
  }

  if (!session) {
    return (
      <LoginPage
        onSuccess={handleAuthSuccess}
        onGoRegister={() => setAuthScreen('register')}
      />
    );
  }

  return (
    <AppMain
      session={session}
      currentUser={sessionToUser(session)}
      onLogout={handleLogout}
    />
  );
}

interface AppMainProps {
  session: AuthSession;
  currentUser: User;
  onLogout: () => void;
}

function AppMain({ session, currentUser, onLogout }: AppMainProps) {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [participantsByOp, setParticipantsByOp] = useState<Record<string, Participant[]>>({});
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [operationsError, setOperationsError] = useState('');

  const [detailOperation, setDetailOperation] = useState<Operation | null>(null);
  const [editorOperation, setEditorOperation] = useState<Operation | null | 'new'>('new');
  const [editorOpen, setEditorOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const canCreateOperation = hasPrivilege(session, 'INCEPTION_CREATE_OPERATION');
  const isOrganizer = currentUser.role === 'organizer';
  const canViewRequests = hasPrivilege(session, 'INCEPTION_VIEW_OWN_REQUESTS')
    || hasPrivilege(session, 'INCEPTION_REVIEW_REQUEST');
  const canEditOperations = hasPrivilege(session, 'INCEPTION_EDIT_OPERATION');
  const canManageParticipants = hasPrivilege(session, 'INCEPTION_MANAGE_PARTICIPANTS');
  const canStartPlanning = hasPrivilege(session, 'INCEPTION_START_PLANNING');
  const canFinalizeOperation = hasPrivilege(session, 'INCEPTION_FINALIZE_OPERATION');
  const canLaunchOperation = hasPrivilege(session, 'INCEPTION_LAUNCH_OPERATION');
  const canConfirmPasiv = hasPrivilege(session, 'INCEPTION_CONFIRM_PASIV_READINESS');
  const showOperationsTab = canCreateOperation
    || hasPrivilege(session, 'INCEPTION_VIEW_OPERATIONS')
    || hasPrivilege(session, 'INCEPTION_VIEW_ASSIGNED_OPERATIONS');

  type MainTab = 'operations' | 'requests' | 'notifications';
  const [activeMainTab, setActiveMainTab] = useState<MainTab>(
    showOperationsTab ? 'operations' : canViewRequests ? 'requests' : 'notifications',
  );
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const reloadUnreadCount = useCallback(async () => {
    try {
      const count = await fetchUnreadCount();
      setUnreadNotifications(count);
    } catch {
    }
  }, []);

  useEffect(() => {
    reloadUnreadCount();
    const interval = setInterval(reloadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [reloadUnreadCount]);

  const reloadOperations = useCallback(async () => {
    if (!showOperationsTab) return;
    setOperationsLoading(true);
    setOperationsError('');
    try {
      const data = await fetchOperations();
      setOperations(data.map(toOperation));
      const participants: Record<string, Participant[]> = {};
      for (const dto of data) {
        participants[dto.id] = toParticipants(dto);
      }
      setParticipantsByOp(participants);
    } catch (err) {
      setOperationsError(err instanceof ApiError ? err.message : 'Не удалось загрузить операции');
    } finally {
      setOperationsLoading(false);
    }
  }, [showOperationsTab]);

  useEffect(() => {
    reloadOperations();
  }, [reloadOperations]);

  const visibleOperations = operations;

  const handleSaveOperation = async (operation: Operation) => {
    const isNew = !operations.find(op => op.id === operation.id);
    if (isNew) {
      const newOp = { ...operation, id: Date.now().toString(), createdBy: currentUser.login };
      setOperations(prev => [...prev, newOp]);
      setEditorOpen(false);
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      const updated = await updateOperation(operation.id, operation);
      handleOperationUpdate(updated);
      setEditorOpen(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Не удалось сохранить операцию';
      setSaveError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleOperationUpdate = (updated: Operation) => {
    setOperations(prev => prev.map(op =>
      op.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : op
    ));
    setDetailOperation(prev => (prev && prev.id === updated.id ? updated : prev));
  };

  const handleStatusChange = async (operationId: string, newStatus: Operation['status']) => {
    const updated = await changeOperationStatus(operationId, newStatus);
    setOperations(prev => prev.map(op =>
      op.id === operationId ? { ...updated, updatedAt: new Date().toISOString() } : op
    ));
  };

  const handleParticipantsChange = (operationId: string, participants: Participant[]) => {
    setParticipantsByOp(prev => ({ ...prev, [operationId]: participants }));
  };

  const handleOperationApproved = () => {
    reloadOperations();
    setActiveMainTab('operations');
  };

  if (detailOperation) {
    const liveOperation = operations.find(op => op.id === detailOperation.id) ?? detailOperation;
    return (
      <OperationDetail
        operation={liveOperation}
        participants={participantsByOp[liveOperation.id] ?? []}
        onClose={() => setDetailOperation(null)}
        onSave={async (op) => { await handleSaveOperation(op); }}
        onStatusChange={handleStatusChange}
        onOperationUpdate={handleOperationUpdate}
        onParticipantsChange={(p) => handleParticipantsChange(liveOperation.id, p)}
        currentUser={currentUser}
        canManageParticipants={
          canManageParticipants && liveOperation.createdBy === currentUser.login
        }
        canStartPlanning={canStartPlanning && liveOperation.createdBy === currentUser.login}
        canFinalizeOperation={canFinalizeOperation && liveOperation.createdBy === currentUser.login}
        canLaunchOperation={canLaunchOperation && liveOperation.createdBy === currentUser.login}
        canConfirmPasiv={canConfirmPasiv && (participantsByOp[liveOperation.id] ?? []).some(
          p => p.login === currentUser.login && p.role === 'chemist',
        )}
      />
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Inception Operation System
          </Typography>
          <Chip
            label={`${currentUser.login}: ${ROLE_LABELS[currentUser.role]}`}
            color="primary"
            variant="outlined"
            sx={{ mr: 2, bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)' }}
          />
          <Button color="inherit" startIcon={<Logout />} onClick={onLogout}>
            Выйти
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Tabs
          value={activeMainTab}
          onChange={(_, v: MainTab) => setActiveMainTab(v)}
          sx={{ mb: 3 }}
        >
          {showOperationsTab && <Tab value="operations" label="Операции" />}
          {canViewRequests && (
            <Tab
              value="requests"
              label="Заявки"
            />
          )}
          <Tab
            value="notifications"
            label={(
              <Badge color="error" badgeContent={unreadNotifications} max={99}>
                <Box component="span" sx={{ pr: unreadNotifications > 0 ? 2 : 0 }}>Уведомления</Box>
              </Badge>
            )}
          />
        </Tabs>

        {activeMainTab === 'operations' && showOperationsTab && (
          operationsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {operationsError && <Typography color="error" sx={{ mb: 2 }}>{operationsError}</Typography>}
              <OperationList
                operations={visibleOperations}
                onCreateNew={
                  canCreateOperation && !isOrganizer
                    ? () => { setEditorOperation('new'); setEditorOpen(true); }
                    : undefined
                }
                onEdit={(op) => { setEditorOperation(op); setEditorOpen(true); }}
                onView={(op) => setDetailOperation(op)}
                onStatusChange={handleStatusChange}
                canEdit={canEditOperations && !isOrganizer}
                emptyHint={
                  isOrganizer
                    ? 'Нет операций. Операции появляются после одобрения заявок.'
                    : undefined
                }
              />
            </>
          )
        )}

        {activeMainTab === 'requests' && canViewRequests && (
          <RequestsTab
            currentUser={currentUser}
            onOperationApproved={() => {
              handleOperationApproved();
              reloadUnreadCount();
            }}
          />
        )}

        {activeMainTab === 'notifications' && (
          <NotificationsTab
            onUnreadChange={setUnreadNotifications}
            onNavigateToRequests={canViewRequests ? () => setActiveMainTab('requests') : undefined}
            onNavigateToOperations={showOperationsTab ? () => setActiveMainTab('operations') : undefined}
          />
        )}
      </Container>

      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} fullWidth maxWidth="md" scroll="paper">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editorOperation === 'new' ? 'Создание новой операции' : 'Редактирование операции'}
          <IconButton onClick={() => setEditorOpen(false)} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
          <OperationEditor
            operation={editorOperation === 'new' ? null : editorOperation}
            onSave={handleSaveOperation}
            onCancel={() => setEditorOpen(false)}
            hideTitle
            saving={saving}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
