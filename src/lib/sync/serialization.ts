import type {
    NotebookDocument,
    KaraokeSong,
    SerializedDocument,
    SerializedSong
} from './types';

export function serializeDocument(doc: NotebookDocument): SerializedDocument {
    return {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString()
    };
}

export function deserializeDocument(data: SerializedDocument): NotebookDocument {
    return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
    };
}

export function serializeSong(song: KaraokeSong): SerializedSong {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { audioBlob: _, ...rest } = song;
    return {
        ...rest,
        createdAt: song.createdAt.toISOString(),
        updatedAt: song.updatedAt.toISOString()
    };
}

export function deserializeSong(data: SerializedSong): KaraokeSong {
    return {
        ...data,
        audioBlob: undefined,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
    };
}
