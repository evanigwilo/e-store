
import '@testing-library/jest-dom/extend-expect'
import { loadEnvConfig } from '@next/env';
import "whatwg-fetch";

loadEnvConfig(process.cwd());