import {
	assertNoAzureExecutions,
	replaceStoredAtCheck,
	STORED_AT_VALUES_AFTER,
	STORED_AT_VALUES_BEFORE,
} from '../common/1784000000032-AllowAzureStoredAt';
import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * SQLite variant: widening the `storedAt` CHECK recreates the table, and
 * `execution_entity` has incoming CASCADE FKs, so we run with foreign keys
 * disabled to avoid cascading deletes of execution data/metadata/annotations.
 */
export class AllowAzureStoredAt1784000000032 implements ReversibleMigration {
	withFKsDisabled = true as const;

	async up(ctx: MigrationContext) {
		await replaceStoredAtCheck(ctx, STORED_AT_VALUES_AFTER);
	}

	async down(ctx: MigrationContext) {
		await assertNoAzureExecutions(ctx);
		await replaceStoredAtCheck(ctx, STORED_AT_VALUES_BEFORE);
	}
}
