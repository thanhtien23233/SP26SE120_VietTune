import { apiFetch, apiOk, asApiEnvelope, unwrapServiceResponse } from '@/api';
import type {
  ApiAdminUpdateRoleRequest,
  ApiAdminUpdateStatusRequest,
  ApiAdminUserAdminDto,
  ApiAdminUserDetailAdminDto,
  ApiAdminUsersListQuery,
  ApiAdminUsersPagedList,
} from '@/api';
import { extractArray, extractObject } from '@/utils/apiHelpers';

export type AdminUserRow = {
  id?: string;
  userId?: string;
  username?: string;
  email?: string;
  fullName?: string;
  role?: string;
  isActive?: boolean;
  status?: string;
};

type AdminUserListItem = AdminUserRow | string;
type AdminUserListResponse =
  | AdminUserListItem[]
  | ApiAdminUsersPagedList
  | {
      data?: AdminUserListItem[];
      Data?: AdminUserListItem[];
      items?: AdminUserListItem[];
      Items?: AdminUserListItem[];
      users?: AdminUserListItem[];
      Users?: AdminUserListItem[];
      results?: AdminUserListItem[];
      result?: AdminUserListItem[];
      value?: AdminUserListItem[];
    };

export const adminApi = {
  async getUsers(): Promise<AdminUserRow[]> {
    // Per paths.txt: prefer User API for listing users.
    // Fallback to Admin users endpoint when needed.
    const normalize = (res: AdminUserListResponse): AdminUserRow[] => {
      const rawArr = extractArray<AdminUserListItem>(res);
      return rawArr
        .map((it) => {
          let row: AdminUserRow | null = null;
          // Support minimal mocks: ["a@gmail.com","b@gmail.com"]
          if (typeof it === 'string') {
            row = { id: it, email: it, username: it };
            return row;
          }
          if (it && typeof it === 'object') {
            const dto = it as ApiAdminUserAdminDto;
            row = {
              ...(it as AdminUserRow),
              id: dto.id ?? (it as AdminUserRow).id,
              email: dto.email ?? (it as AdminUserRow).email,
              fullName: dto.fullName ?? (it as AdminUserRow).fullName,
              role: dto.role ?? (it as AdminUserRow).role,
              status: dto.status ?? (it as AdminUserRow).status,
            };
            return row;
          }
          return row;
        })
        .filter((x): x is AdminUserRow => x !== null);
    };

    try {
      const res = await apiOk(
        asApiEnvelope<AdminUserListResponse>(apiFetch.GET('/api/User/GetAll')),
      );
      const list = normalize(res);
      if (list.length > 0) return list;
    } catch {
      // ignore and fallback
    }

    const params: ApiAdminUsersListQuery = {};
    const fallback = await apiOk(
      apiFetch.GET('/api/Admin/users', {
        params: { query: params },
      }),
    );
    const unwrapped = unwrapServiceResponse<ApiAdminUsersPagedList>(fallback as unknown);
    return normalize((unwrapped ?? fallback) as AdminUserListResponse);
  },

  async getUserById(id: string): Promise<AdminUserRow | null> {
    const res = await apiOk(
      apiFetch.GET('/api/Admin/users/{id}', {
        params: { path: { id } },
      }),
    );
    const unwrapped = unwrapServiceResponse<ApiAdminUserDetailAdminDto>(res as unknown);
    const obj = extractObject(unwrapped ?? res);
    return obj ? (obj as AdminUserRow) : null;
  },

  async updateUserRole(id: string, role: string): Promise<void> {
    const payload: ApiAdminUpdateRoleRequest = { role };
    await apiOk(
      apiFetch.PUT('/api/Admin/users/{id}/role', {
        params: { path: { id } },
        body: payload,
      }),
    );
  },

  async updateUserStatus(id: string, isActive: boolean): Promise<void> {
    const payload: ApiAdminUpdateStatusRequest & { isActive: boolean } = {
      status: isActive ? 'active' : 'inactive',
      isActive,
    };
    await apiOk(
      apiFetch.PUT('/api/Admin/users/{id}/status', {
        params: { path: { id } },
        body: payload,
      }),
    );
  },
};
