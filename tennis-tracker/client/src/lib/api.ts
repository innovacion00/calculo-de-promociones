import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

export type Player = {
  id: number;
  name: string;
  category: string;
  birthdate?: string;
  nationality: string;
  active: boolean;
};

export type Tournament = {
  id: number;
  name: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  surface: string;
  category?: string;
  players: string;
  level: string;
  matches?: Match[];
};

export type Match = {
  id: number;
  playerId: number;
  tournamentId?: number;
  date: string;
  result: 'W' | 'L' | 'WO' | 'P';
  opponentName: string;
  opponentNationality?: string;
  score?: string;
  round?: string;
  surface?: string;
  city?: string;
  country?: string;
  notes?: string;
  duration?: number;
  player?: Player;
  tournament?: Tournament;
};

export type PlayerStats = {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  streakType: 'W' | 'L' | null;
  longestWinStreak: number;
  tournamentsPlayed: number;
  countriesPlayed: number;
  statsBySurface: { surface: string; matches: number; wins: number; winRate: number }[];
  monthlyChart: { month: string; winRate: number | null; matches: number }[];
};
