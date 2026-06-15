import { UnexpectedError } from 'n8n-workflow';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'execution_entity';
const COLUMN = 'storedAt';

export const STORED_AT_VALUES_BEFORE = ['db', 'fs', 's3'];
export const STORED_AT_VALUES_AFTER = ['db', 'fs', 's3', 'az'];

export async function assertNoAzureExecutions(ctx: MigrationContext) {
	const rows = await ctx.runQuery<Array<{ azureCount: number }>>(
		`SELECT COUNT(*) AS "azureCount" FROM ${ctx.escape.tableName(TABLE)} WHERE ${ctx.escape.columnName(COLUMN)} = 'az'`,
	);
	const count = Number(rows[0]?.azureCount ?? 0);
	if (count > 0) {
		throw new UnexpectedError(
			`Cannot roll back: ${count} execution(s) still store data on Azure Blob (storedAt='az'). Migrate their data back to the database before rolling back this migration.`,
		);
	}
}

export async function replaceStoredAtCheck(ctx: MigrationContext, values: string[]) {
	const { queryRunner, tablePrefix, schemaBuilder } = ctx;
	const table = await queryRunner.getTable(`${tablePrefix}${TABLE}`);

	if (table) {
		const storedAtChecks = table.checks.filter(
			(check) =>
				(check.columnNames?.includes(COLUMN) ?? false) ||
				(check.expression?.includes(COLUMN) ?? false),
		);
		for (const check of storedAtChecks) {
			await queryRunner.dropCheckConstraint(table, check);
		}
	}

	await schemaBuilder.addEnumCheck(TABLE, COLUMN, values, { recreatesOnSqlite: true });
}

export class AllowAzureStoredAt1784000000032 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		await replaceStoredAtCheck(ctx, STORED_AT_VALUES_AFTER);
	}

	async down(ctx: MigrationContext) {
		await assertNoAzureExecutions(ctx);
		await replaceStoredAtCheck(ctx, STORED_AT_VALUES_BEFORE);
	}
}
