import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export class FileUtils {
    static async removeFolderRecursively(path: string): Promise<void> {
        await rm(path, {
            force: true,
            recursive: true
        })
    }

    /**
     * TODO: to replace with fsPromises.mkdtempDisposable once node version
     * is updated to 24.x. Keep the tmpdir() path
     */
    static async mkdtempDisposable() {
        const path = await mkdtemp(join(tmpdir(), 'file-uploading-'));

        return {
            path: path,
            remove: FileUtils.removeFolderRecursively.bind(null, path) as () => Promise<void>,
            async [Symbol.asyncDispose]() {
                await FileUtils.removeFolderRecursively.bind(null, path)
            }
        }
    }
}