/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from './useAuth';

export interface Project {
  id: number;
  name: string;
  description?: string;
  ownerId?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
  tasks_completed?: number;
  tasks_total?: number;
  members?: Array<{ id: number; name: string; avatar?: string }>;
}

export type ProjectContextValue = {
  projects: Project[];
  invites: { id: number; projectId: number }[];
  createProject: (payload: { name: string; description?: string }) => Promise<unknown>;
  inviteMember: (payload: { projectId: number; userId: number; role?: string }) => Promise<unknown>;
  addMember: (projectId: number, userId: number, role?: string) => Promise<unknown>;
  changeMemberRole: (projectId: number, userId: number, role: string) => Promise<unknown>;
  acceptInvite: (id: number) => Promise<unknown>;
  fetchMyProjects: () => Promise<void>;
  fetchInvites: () => Promise<void>;
  fetchAllProjects: () => Promise<void>;
  getProject: (id: number) => Promise<unknown>;
  updateProject: (id: number, payload: ProjectUpdatePayload) => Promise<unknown>;
  deleteProject: (id: number) => Promise<unknown>;
  removeMember: (projectId: number, userId: number) => Promise<unknown>;
}

type ProjectUpdatePayload = {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
};

const ProjectContext = createContext<ProjectContextValue>({} as ProjectContextValue);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state: authState } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [invites, setInvites] = useState<{ id:number; projectId:number }[]>([]);
  const sampleProjects = useMemo(() => [
    { id: 1, name: 'Fizvizz', description: 'Analytics Dashboard', start_date: '2021-01-10', end_date: '2021-03-30', status: 'Active', tasks_completed: 12, tasks_total: 20, members: [{id:1,name:'Alice'},{id:2,name:'Bob'}] },
    { id: 2, name: 'Sprint Planning', description: 'Planning the next Sprint', start_date: '2021-05-05', end_date: '2021-05-18', status: 'On Hold', tasks_completed: 20, tasks_total: 20, members: [{id:3,name:'Carol'},{id:4,name:'Dan'}] },
    { id: 3, name: 'Website Redesign', description: "Redesign the company's website", start_date: '2021-02-01', end_date: '2021-07-01', status: 'Completed', tasks_completed: 8, tasks_total: 15, members: [{id:2,name:'Bob'},{id:3,name:'Carol'}] },
  ], []);

  const fetchMyProjects = useCallback(async () => {
    try {
      const res = await axios.get('/api/projects/me', { withCredentials: true });
      const data = res.data || [];
      if (!data || data.length === 0) {
        // fallback sample data for UI when backend has no projects
        setProjects(sampleProjects);
      } else {
        setProjects(data);
      }
    } catch (err) {
      console.error('fetchMyProjects error', err);
    }
  }, [sampleProjects]);

  const fetchAllProjects = async () => {
    try {
      const res = await axios.get('/api/projects', { withCredentials: true });
      const data = res.data || [];
      if (!data || data.length === 0) setProjects(sampleProjects);
      else setProjects(data);
    } catch (err) {
      console.error('fetchAllProjects error', err);
    }
  };

  const fetchInvites = useCallback(async () => {
    try {
      const res = await axios.get('/api/projects/invites', { withCredentials: true });
      setInvites(res.data || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    if (!authState.initialized || !authState.user) return;
    fetchMyProjects();
    fetchInvites();
  }, [authState.initialized, authState.user, fetchMyProjects, fetchInvites]);

  const createProject = async (payload: { name: string; description?: string }) => {
    const res = await axios.post('/api/projects', payload, { withCredentials: true });
    // refresh list depending on role
    if (authState.user?.role === 'admin') await fetchAllProjects(); else await fetchMyProjects();
    return res.data;
  };

  const updateProject = async (id: number, payload: { name?: string; description?: string; startDate?: string; endDate?: string; status?: string }) => {
    const res = await axios.put(`/api/projects/${id}`, payload, { withCredentials: true });
    if (authState.user?.role === 'admin') await fetchAllProjects(); else await fetchMyProjects();
    return res.data;
  };

  const deleteProject = async (id: number) => {
    const res = await axios.delete(`/api/projects/${id}`, { withCredentials: true });
    if (authState.user?.role === 'admin') await fetchAllProjects(); else await fetchMyProjects();
    return res.data;
  };

  const inviteMember = async (payload: { projectId: number; userId: number; role?: string }) => {
    const res = await axios.post('/api/projects/invite', payload, { withCredentials: true });
    await fetchInvites();
    return res.data;
  };

  const addMember = async (projectId: number, userId: number, role: string = 'member') => {
    const res = await axios.post(`/api/projects/${projectId}/members`, { userId, role }, { withCredentials: true });
    await fetchMyProjects();
    return res.data;
  };

  const changeMemberRole = async (projectId: number, userId: number, role: string) => {
    const res = await axios.put(`/api/projects/${projectId}/members/${userId}/role`, { role }, { withCredentials: true });
    await fetchMyProjects();
    return res.data;
  };

  const getProject = async (id: number) => {
    const res = await axios.get(`/api/projects/${id}`, { withCredentials: true });
    return res.data;
  };

  const removeMember = async (projectId: number, userId: number) => {
    const res = await axios.delete(`/api/projects/${projectId}/members/${userId}`, { withCredentials: true });
    await fetchMyProjects();
    return res.data;
  };

  const acceptInvite = async (id: number) => {
    const res = await axios.post(`/api/projects/invites/${id}/accept`, {}, { withCredentials: true });
    await fetchMyProjects();
    await fetchInvites();
    return res.data;
  };

  return (
    <ProjectContext.Provider value={{ projects, invites, createProject, inviteMember, addMember, changeMemberRole, acceptInvite, fetchMyProjects, fetchInvites, fetchAllProjects, getProject, updateProject, deleteProject, removeMember }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => useContext(ProjectContext);


