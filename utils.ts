import { DenoDOM, TurndownService } from './deps.ts';

export function html2md(html: string): string {
	// refs: https://github.com/mixmark-io/turndown/issues/390
	const parser = new DenoDOM.DOMParser();
	const service = new TurndownService.default();
	const document = parser.parseFromString(html, 'text/html');
	const markdown = service.turndown(document);
	return markdown;
}

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function random(min: number, max: number) {
	return min + Math.floor(Math.random() * (max - min + 1));
}
