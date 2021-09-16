// deno-lint-ignore-file camelcase

/**
 * 爬取 {@link https://time.geekbang.org 极客时间} 专栏文章
 *
 * @example
 * ```bash
 * deno run -A --unstable scripts/geekbang.ts <columnId> [dist]
 * ```
 */
import { JSONObject } from '../types.d.ts';
import { dotenv, fs, path } from '../deps.ts';
import { html2md, random, sleep } from '../utils.ts';

const env = dotenv.config();
const COOKIE = env['GEEKBANG_COOKIE'];
if (!COOKIE) {
	throw new Error('required `GEEKBANG_COOKIE` in environment');
}

const [columnId, DIST = 'dist'] = Deno.args;
if (!columnId) {
	throw new Error('required `columnId` in arguments');
}

const USER_AGENT =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36';

const API_ROOT = 'https://time.geekbang.org';
const API_INTRO = `${API_ROOT}/serv/v1/column/intro`;
const API_CHAPTERS = 'https://time.geekbang.org/serv/v1/chapters';
const API_ARTICLES = `${API_ROOT}/serv/v1/column/articles`;
const API_ARTICLE = `${API_ROOT}/serv/v1/article`;

(async function main() {
	// 1. 爬取课程介绍
	const dir = await crawlingIntroduce(columnId);

	// 2. 爬取所有章节
	await crawlingChapters(columnId, dir);
})();

async function post<T>(
	url: string,
	json: JSONObject,
): Promise<T> {
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			referer: API_ROOT,
			'Cookie': COOKIE,
			'User-Agent': USER_AGENT,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(json),
	});
	const { code, data, error, extra } = await response.json();
	if (error.msg) {
		throw new Error(`error: ~> ${JSON.stringify(error)}`);
	}
	if (!Object.keys(data)) {
		throw new Error(
			`empty: ~> ${JSON.stringify({ code, data, error, extra })}`,
		);
	}
	return data;
}

interface Intro {
	column_title: string;
	column_subtitle: string;
	column_intro: string;
	article_total_count: string;
}
interface CHAPTER {
	id: string;
	title: string;
	article_count: string;
}
interface ARTICLE {
	id: string;
	article_title: string;
	chapter_id: string;
	article_cover: string;
	article_content: string;
}
interface Pagination {
	count: number;
	more: boolean;
}

async function crawlingIntroduce(columnId: string): Promise<string> {
	const {
		column_title: title,
		column_subtitle: summary,
		column_intro: introduce,
	} = await post<Intro>(API_INTRO, {
		cid: columnId,
	});

	const dir = path.join(DIST, title);

	await fs.ensureDir(dir);
	await Deno.writeTextFile(
		path.join(dir, `Introduce.md`),
		[`# ${title}\n`, `> ${summary}\n`, html2md(`${introduce}`)].join(
			'\n',
		),
	);
	console.log(`Write Introduce.md in ${dir}`);
	return dir;
}

async function crawlingChapters(columnId: string, dir: string) {
	const [chapters, { list: articles }] = await Promise.all([
		await post<CHAPTER[]>(API_CHAPTERS, {
			cid: columnId,
		}),
		await post<{ list: ARTICLE[]; page: Pagination }>(API_ARTICLES, {
			cid: columnId,
			order: 'earliest',
			prev: 0,
			sample: false,
			size: 500,
		}),
	]);

	const chapterMap = new Map<string, CHAPTER>();
	for (const chapter of chapters) {
		chapterMap.set(chapter.id, chapter);
	}

	let markdown = '# Chapters\n\n';
	for (let { id, article_title: title } of articles) {
		title = title.replace(/\s/g, '');
		markdown += `- [${title}](./${title}.md)\n`;
		await crawlingArticle(id, title, dir);
		await sleep(random(1000, 3000));
	}

	await Deno.writeTextFile(
		path.join(dir, `Chapters.md`),
		markdown,
	);
}

async function crawlingArticle(id: string, title: string, dir: string) {
	try {
		const article = await post<ARTICLE>(API_ARTICLE, {
			id,
			include_neighbors: true,
			is_freelyread: true,
		});

		const preappend = [
			`<h1>${title}</h1>`,
			`<img src="${article.article_cover}" />`,
		].join('\n');

		const markdown = html2md(preappend + article.article_content);

		await Deno.writeTextFile(
			path.join(dir, `${title}.md`),
			markdown,
		);

		console.log(`Write Introduce.md in ${dir}`);
	} catch (error) {
		console.error(`Crawling ${title} Fial ~> ${error}`);
	}
}
