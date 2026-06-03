import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type { UserRole } from '../types';

export interface DbUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: UserRole;
  avatar?: string;
  isActive?: boolean;
}

const USERS_KEY = ['users'] as const;

export const useUsers = () => {
  return useQuery<DbUser[]>({
    queryKey: USERS_KEY,
    queryFn: async () => {
      const res = await apiClient.get('/users');
      return res.data.data as DbUser[];
    },
    staleTime: 60 * 1000,
  });
};

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation<DbUser, Error, CreateUserPayload>({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/users', payload);
      return res.data.data as DbUser;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation<DbUser, Error, { id: string; payload: UpdateUserPayload }>({
    mutationFn: async ({ id, payload }) => {
      const res = await apiClient.put(`/users/${id}`, payload);
      return res.data.data as DbUser;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
};

export const useActivateUser = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.patch(`/users/${id}/activate`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
};

export const useDeactivateUser = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.patch(`/users/${id}/deactivate`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
};
