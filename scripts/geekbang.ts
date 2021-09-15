// deno-lint-ignore-file camelcase

const USER_AGENT =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36';
const COOKIE =
	'gksskpitn=3f60586e-2499-4317-8116-086cfef57b54; SERVERID=1fa1f330efedec1559b3abbcb6e30f50|1631692592|1631692592; _ga=GA1.2.825464792.1631692593; _gid=GA1.2.2126294720.1631692593; _gat=1; sajssdk_2015_cross_new_user=1; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%2217be87515da7b8-0f57ad68d5370b-1f3e6757-3686400-17be87515db787%22%2C%22first_id%22%3A%22%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_landing_page%22%3A%22https%3A%2F%2Ftime.geekbang.org%2Fcolumn%2Fintro%2F100002201%22%7D%2C%22%24device_id%22%3A%2217be87515da7b8-0f57ad68d5370b-1f3e6757-3686400-17be87515db787%22%7D; Hm_lvt_022f847c4e3acd44d4a2481d9187f1e6=1631692581; Hm_lpvt_022f847c4e3acd44d4a2481d9187f1e6=1631692593; Hm_lvt_59c4ff31a9ee6263811b23eb921a5083=1631692581; Hm_lpvt_59c4ff31a9ee6263811b23eb921a5083=1631692593; LF_ID=1631692592724-3811270-1843763; gk_process_ev={%22count%22:1}; GRID=e5d6755-5a5ec78-c999380-274a6aa';

const DIST = 'dist';

const API_ROOT = 'https://time.geekbang.org';
const API_INTRO = `${API_ROOT}/serv/v1/column/intro`;
const API_CHAPTERS = 'https://time.geekbang.org/serv/v1/chapters';
const API_ARTICLES = `${API_ROOT}/serv/v1/column/articles`;
const API_ARTICLE = `${API_ROOT}/serv/v1/column/article`;

import { JSONObject } from '../types.d.ts';
import { fs, path } from '../deps.ts';
import { html2md, random, sleep } from '../utils.ts';

/**
 * 爬取 {@link https://time.geekbang.org 极客时间} 专栏文章
 *
 * @example
 * ```bash
 * deno run -A --unstable scripts/geekbang.ts
 * ```
 */
async function main(columnId: string) {
	// 1. 爬取课程介绍
	const dir = await crawlingIntroduce(columnId);

	// 2. 爬取所有章节
	await crawlingChapters(columnId, dir);
}

async function post<T>(
	url: string,
	json: JSONObject,
): Promise<T> {
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			referer: API_ROOT,
			// origin: API_ROOT,
			// TODO:
			'Cookie':
				'gksskpitn=d3445fd4-d5e3-4df2-a578-fc4ed6b402ea; _gid=GA1.2.1364071476.1631725697; SERVERID=1fa1f330efedec1559b3abbcb6e30f50|1631727407|1631725694',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(json),
	});

	const data = await response.json();
	console.log(data);
	return data.data;
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
		path.join(DIST, title, `Introduce.md`),
		[`# ${title}\n`, `> ${summary}\n`, html2md(`${introduce}`)].join(
			'\n',
		),
	);

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
	const article = await post<ARTICLE>(API_ARTICLE, {
		id,
		include_neighbors: true,
		is_freelyread: true,
	});
	console.log(article);
	const preappend = [
		`<h1>${title}</h1>`,
		`<img src="${article.article_cover}" />`,
	].join('\n');

	const markdown = html2md(preappend + article);

	await Deno.writeTextFile(
		path.join(dir, `${title}.md`),
		markdown,
	);
}

await main('100002201');
