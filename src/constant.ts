/**
 * System-wide constants.
 *
 * May be read from package.json
 */

import { DocumentSelector } from 'coc.nvim';
// @ts-ignore
import { sqlfluffVersion } from '../package.json';

export const SQLFLUFF_VERSION = sqlfluffVersion;

export const SUPPORT_LANGUAGES = ['sql', 'jinja-sql'];

export const documentSelector: DocumentSelector = [
  { language: 'sql', scheme: 'file' },
  { language: 'jinja-sql', scheme: 'file' },
];
