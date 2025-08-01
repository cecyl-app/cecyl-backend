import { ObjectId } from "@fastify/mongodb";

type WithId<T> = T & { _id: ObjectId }

export function buildProjectionOption<T>(...fields: (keyof WithId<T> | '_id')[]): { projection: { [P in keyof WithId<T>]?: 1 } } {
    const projection: { [P in keyof WithId<T>]?: 1 } = {};
    for (const f of fields) {
        projection[f] = 1;
    }

    return { projection };
}