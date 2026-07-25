import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { createDatabaseOptions, loadConfiguration } from './configuration';

export const AppDataSource = new DataSource(
  createDatabaseOptions(loadConfiguration()),
);
