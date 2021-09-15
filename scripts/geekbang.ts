#!/usr/bin/env deno run --allow-read=dist --allow-write=dist --allow-net=time.geekbang.org --unstable

/**
 * 爬取 {@link https://time.geekbang.org 极客时间} 专栏文章
 */

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

import { fs, path } from '../deps.ts';
import { html2md } from '../utils/index.ts';

async function main(columnId: string) {
	// 1. 爬取课程介绍
	const dir = await crawlingIntroduce(columnId);

	// 2. 爬取所有章节
	await crawlingChapters(columnId, dir);

	// const { chapters } = data;
	// console.log(chapters);
	// chapters.forEach(({ cid, title, url }) => {
}

async function crawlingIntroduce(columnId: string): Promise<string> {
	const response = await fetch(API_INTRO, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			referer: API_ROOT,
		},
		body: JSON.stringify({
			cid: columnId,
		}),
	});
	const { data } = await response.json();
	const {
		column_title: title,
		column_subtitle: summary,
		column_intro: introduce,
		article_total_count: count,
	} = data;

	const introIndex = '0'.padStart(count.toString().length, '0');
	const dir = path.join(DIST, title);

	await fs.ensureDir(dir);
	await Deno.writeTextFile(
		path.join(DIST, title, `${introIndex}_Introduce.md`),
		[`# ${title}\n`, `> ${summary}\n`, html2md(`${introduce}`)].join(
			'\n',
		),
	);
	return dir;
}

async function crawlingChapters(columnId: string, dir: string) {
	const [] = await Promise.all([
		fetch(API_CHAPTERS, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				referer: API_ROOT,
			},
			body: JSON.stringify({
				cid: columnId,
			}),
		}),
		fetch(API_ARTICLES, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				referer: API_ROOT,
			},
			body: JSON.stringify({
				cid: columnId,
				order: 'earliest',
				prev: 0,
				sample: false,
				size: 500,
			}),
		}),
	]);
	// const response = await fetch(API_CHAPTERS, {
	// 	method: 'POST',
	// 	headers: {
	// 		'Content-Type': 'application/json',
	// 		referer: API_ROOT,
	// 	},
	// 	body: JSON.stringify({
	// 		cid: columnId,
	// 	}),
	// });

	// const { data } = await response.json();
	// const chapters = data.map((
	// 	item: { title: string; article_count: string },
	// ) => ({
	// 	title: item.title,
	// 	count: item.article_count,
	// }));

	// console.log(chapters);

	// fetch(API_ARTICLES, {
	// 	method: 'POST',
	// 	headers: {
	// 		'Content-Type': 'application/json',
	// 		referer: API_ROOT,
	// 	},
	// 	body: JSON.stringify({
	// 		cid: columnId,
	// 		order: 'earliest',
	// 		prev: 0,
	// 		sample: false,
	// 		size: 500,
	// 	}),
	// });
}

async function _fetch(url: string, body: unknown): Promise<JSON> {
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			referer: API_ROOT,
		},
		body: JSON.stringify(body),
	});
	return await response.json();
}

await main('100002201');
