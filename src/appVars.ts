export const typedaiDirName = '.typedai';

export const TYPEDAI_FS = 'TYPEDAI_FS';

export function systemDir() {
	// When deploying TypedAI on a VM with a non-boot persistent disk for storage, then set TYPEDAI_SYS_DIR
	return `${process.env.TYPEDAI_SYS_DIR || process.cwd()}/${typedaiDirName}`;
}
