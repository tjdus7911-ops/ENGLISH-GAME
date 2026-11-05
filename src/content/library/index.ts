import { parseBooks, type Book } from './parse';
import a1 from './books-a1';
import a2 from './books-a2';
import b1 from './books-b1';
import b2c1 from './books-b2c1';

export * from './parse';
export const BOOKS: Book[] = [a1, a2, b1, b2c1].flatMap(parseBooks);
export const BOOK_BY_ID: Record<string, Book> = Object.fromEntries(BOOKS.map((b) => [b.id, b]));
export const bookSentences = (b: Book) => b.pages.flatMap((p) => p.sentences);
