import * as fs from 'fs';
import * as path from 'path';

const MANIFEST_PATH = path.resolve(__dirname, '../../openclaw.plugin.json');

// Minimal shape of a tool entry in a toolGroup
interface ToolEntry {
  name: string;
  description: string;
}

// Minimal shape of a toolGroup entry
interface ToolGroup {
  name: string;
  description: string;
  enabled: boolean;
  tools: ToolEntry[];
}

// Full manifest shape we expect
interface OpenClawManifest {
  id: string;
  configSchema: Record<string, unknown>;
  toolGroups: ToolGroup[];
  [key: string]: unknown;
}

function loadManifest(): OpenClawManifest {
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  return JSON.parse(raw) as OpenClawManifest;
}

describe('openclaw.plugin.json manifest', () => {
  let manifest: OpenClawManifest;

  beforeAll(() => {
    manifest = loadManifest();
  });

  describe('required OpenClaw fields', () => {
    it('has a non-empty id string', () => {
      expect(typeof manifest.id).toBe('string');
      expect(manifest.id.length).toBeGreaterThan(0);
    });

    it('has configSchema as a non-null object', () => {
      expect(manifest.configSchema).not.toBeNull();
      expect(typeof manifest.configSchema).toBe('object');
      expect(Array.isArray(manifest.configSchema)).toBe(false);
    });

    it('configSchema is a valid JSON Schema object (has type field)', () => {
      expect(manifest.configSchema.type).toBe('object');
    });

    it('configSchema.properties is an object', () => {
      expect(manifest.configSchema.properties).toBeDefined();
      expect(typeof manifest.configSchema.properties).toBe('object');
      expect(Array.isArray(manifest.configSchema.properties)).toBe(false);
    });

    it('configSchema.properties does not expose plain-text credential fields', () => {
      const props = manifest.configSchema.properties as Record<string, unknown>;
      expect(props.email).toBeUndefined();
      expect(props.password).toBeUndefined();
    });

    it('configSchema.required does not force email or password during installation', () => {
      const required = (manifest.configSchema.required ?? []) as string[];
      expect(required).not.toContain('email');
      expect(required).not.toContain('password');
    });

    it('configSchema description documents environment-based credentials', () => {
      expect(manifest.configSchema.description).toContain('ODA_EMAIL');
      expect(manifest.configSchema.description).toContain('ODA_PASSWORD');
    });
  });

  describe('toolGroups', () => {
    it('has a toolGroups array', () => {
      expect(Array.isArray(manifest.toolGroups)).toBe(true);
      expect(manifest.toolGroups.length).toBeGreaterThan(0);
    });

    it('each toolGroup has required fields', () => {
      for (const group of manifest.toolGroups) {
        expect(typeof group.name).toBe('string');
        expect(group.name.length).toBeGreaterThan(0);

        expect(typeof group.description).toBe('string');
        expect(group.description.length).toBeGreaterThan(0);

        expect(typeof group.enabled).toBe('boolean');

        expect(Array.isArray(group.tools)).toBe(true);
      }
    });

    it('each tool has name and description', () => {
      for (const group of manifest.toolGroups) {
        for (const tool of group.tools) {
          expect(typeof tool.name).toBe('string');
          expect(tool.name.length).toBeGreaterThan(0);

          expect(typeof tool.description).toBe('string');
          expect(tool.description.length).toBeGreaterThan(0);
        }
      }
    });

    it('has a read-only group enabled by default', () => {
      const readOnly = manifest.toolGroups.find((g) => g.name === 'read-only');
      expect(readOnly).toBeDefined();
      expect(readOnly?.enabled).toBe(true);
    });

    it('has a cart-mutation group disabled by default', () => {
      const cartMutation = manifest.toolGroups.find((g) => g.name === 'cart-mutation');
      expect(cartMutation).toBeDefined();
      expect(cartMutation?.enabled).toBe(false);
    });

    it('has a high-risk group disabled by default', () => {
      const highRisk = manifest.toolGroups.find((g) => g.name === 'high-risk');
      expect(highRisk).toBeDefined();
      expect(highRisk?.enabled).toBe(false);
    });
  });
});
