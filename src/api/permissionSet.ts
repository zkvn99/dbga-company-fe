import { api } from '@/shared/http/client'
import type { PageQuery, PageResponse } from '@/shared/http/types'
import type { AccountRole } from './account'

/**
 * 권한 세트 · 역할 이름(ADR-0031) — iam PermissionSetController · RoleController.
 * 조회 = iam:permission:read, 변경 = iam:permission:manage. 계정에 세트 지정은 accountManageApi.changePermissionSet.
 */

export interface PermissionSet {
  setId: string
  role: AccountRole
  name: string
  description: string | null
  isDefault: boolean
  /** 세트 기능 코드(잠금 포함). */
  features: string[]
  accountCount: number
  updatedAt: string
}

export type PermissionSetHistoryKind = 'CREATE' | 'RENAME' | 'DESCRIPTION' | 'GRANT' | 'REVOKE' | 'DEFAULT' | 'DELETE'

export interface PermissionSetHistoryItem {
  at: string
  kind: PermissionSetHistoryKind
  featureCode: string | null
  before: string | null
  after: string | null
  actorType: string
  actorName: string | null
}

/** 이름 1–50 · 설명 ≤300 · 기능 = 그 역할 assignable 안에서(아니면 400 IAM_FEATURE_NOT_ASSIGNABLE). 잠금 기능은 자동 포함. */
export interface CreatePermissionSetRequest {
  role: AccountRole
  name: string
  description?: string | null
  features: string[]
}

/** 기능 전체 교체 — 잠금은 빠져도 유지. */
export interface EditPermissionSetRequest {
  name: string
  description?: string | null
  features: string[]
}

export interface PermissionSetChanged {
  setId: string
  changed: boolean
}

export interface RenameRoleRequest {
  name: string
}

export interface RoleChanged {
  role: AccountRole
  changed: boolean
}

const SETS = '/api/oit/permission-sets'
const one = (setId: string) => `${SETS}/${encodeURIComponent(setId)}`

export const permissionSetApi = {
  /** 역할 · 기본 먼저 · 이름 순. role 을 빼면 전체. */
  list: (role?: AccountRole | null) => api.get<PermissionSet[]>(SETS, role ? { role } : {}),
  get: (setId: string) => api.get<PermissionSet>(one(setId)),
  /** 삭제된 세트도 조회된다. */
  history: (setId: string, query: PageQuery) => api.get<PageResponse<PermissionSetHistoryItem>>(`${one(setId)}/history`, { ...query }),

  create: (body: CreatePermissionSetRequest) => api.post<PermissionSetChanged>(SETS, body),
  edit: (setId: string, body: EditPermissionSetRequest) => api.put<PermissionSetChanged>(one(setId), body),
  makeDefault: (setId: string) => api.post<PermissionSetChanged>(`${one(setId)}/default`),
  /** 409 IAM_PERMISSION_SET_DEFAULT(기본) · IAM_PERMISSION_SET_IN_USE(사용 중). */
  remove: (setId: string) => api.delete<PermissionSetChanged>(one(setId)),

  /** 역할 표시 이름 — 역할 코드는 불변. */
  renameRole: (role: AccountRole, body: RenameRoleRequest) => api.put<RoleChanged>(`/api/oit/roles/${encodeURIComponent(role)}`, body),
}
