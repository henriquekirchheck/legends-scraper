import { parseArgs } from "@std/cli/parse-args";
import * as path from "@std/path";
import mime from "mime";

export function* multiple<T, N extends number>(
  iterable: Iterable<T>,
  n: N,
): Generator<FixedArray<T, N>> {
  const iterator = iterable[Symbol.iterator]();
  let current = iterator.next();
  let collector = [];
  if (current.done) return;
  do {
    collector.push(current.value);
    if (collector.length === n) {
      yield collector as FixedArray<T, N>;
      collector = [];
    }
    current = iterator.next();
  } while (!current.done);
}

export type FixedArray<
  T,
  N extends number,
  A extends T[] = [],
> = A["length"] extends N ? A : FixedArray<T, N, [T, ...A]>;

export const cacheResult = async <T>(
  path: string,
  getData: () => T | Promise<T>,
): Promise<T> => {
  const fileExists = await Deno.lstat(path).then((file) => file.isFile).catch(
    () => false,
  );

  if (!fileExists) {
    const file = await Deno.open(path, {
      create: true,
      write: true,
    });
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(await getData()));
    await file.write(data);
  }

  return JSON.parse(await Deno.readTextFile(path));
};

export const debug = <T>(t: T): T => {
  console.log(t);
  return t;
};

export const args = parseArgs(Deno.args, {
  boolean: ["open"],
  string: ["result", "music-cache", "pages-cache", "placeholder"],
  default: {
    open: false,
    result: "./result",
    "music-cache": "./music.json",
    "pages-cache": "./pages.json",
    placeholder: "./placeholder.png",
  },
});

export type Music = {
  image?: string;
  title: string;
  mainProducer?: string;
};

export const downloadToFile = async (music: Music) => {
  const baseName = `${music.title}${
    music.mainProducer && ` - ${music.mainProducer}`
  }`.replaceAll("/", "\u2215");

  console.time(music.title);

  if (!music.image) {
    await Deno.copyFile(
      args.placeholder,
      path.join(args.result, `${baseName}.${path.extname(args.placeholder)}`),
    );
    console.timeEnd(music.title);
    return;
  }

  const response = await fetch(music.image);
  const extension = mime.getExtension(response.headers.get("Content-Type")!)!;
  const fileName = `${baseName}.${extension}`;
  const filePath = path.join(args.result, fileName);
  using file = await Deno.open(
    filePath,
    { create: true, write: true },
  );

  await response.body?.pipeTo(file.writable);

  console.timeEnd(music.title);
};
