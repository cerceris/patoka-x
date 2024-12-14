const puppeteer = require('puppeteer');
import { Mutex } from 'async-mutex';

import { Logger } from '../logger';

export class HbpSession {

    browser: any = null;

    // Task UUID --> Page
    pages = new Map<string, any>();

    // Name --> Page
    sharedPages = new Map<string, any>();

    mtx = new Mutex();

    async init(browserParams: string[], devTools = false) {
        this.browser = await puppeteer.launch({
            args: browserParams,
            ignoreHTTPSErrors: true,
            devtools: devTools
        });
    }

    async getPage(
        taskUuid: string,
        acquireSharedPage?: string,
        releaseSharedPage?: string
    )  {
        const unlock = await this.mtx.acquire();
        try {

        let page = this.pages.get(taskUuid);

        if (page) {
            Logger.info('Got the page already held by the task [TASK UUID] '
                + taskUuid
            );

            this.printStatus();

            return page;
        }

        // Maybe the shared page has been created already.
        // If `acquireSharedPage` is specified, then the shared page must
        // exist and this case is handled below in the function.
        // If `acquireSharedPage` is not specified, then the shared page
        // may or may not exist. This case is handled in the next code block.
        if (releaseSharedPage && !acquireSharedPage) {
            let page = this.sharedPages.get(releaseSharedPage);

            if (page) {
                Logger.info('Acquired [SHARED PAGE] ' + releaseSharedPage
                    + ' that will be released later [TASK UUID] ' + taskUuid
                );

                this.sharedPages.delete(releaseSharedPage);

                await page.goto('about:blank');

                this.pages.set(taskUuid, page);

                this.printStatus();

                return page;
            }
        }

        // The page must exist.
        if (acquireSharedPage) {
            page = this.sharedPages.get(acquireSharedPage);

            if (!page) {
                Logger.error('[TASK UUID] ' + taskUuid
                    + ' failed to acquire [SHARED PAGE] '
                    + acquireSharedPage
                );

                this.printStatus();

                throw `Failed to acquire shared page ${acquireSharedPage}`;
            }

            Logger.info('Acquired [SHARED PAGE] ' + acquireSharedPage
                + ' [TASK UUID] ' + taskUuid);

            this.sharedPages.delete(acquireSharedPage);
        }

        // Use the first tab which is not a shared page
        // if there are no active tasks.
        else if (this.pages.size < 1) {
            const sharedPages = new Set(this.sharedPages.values());
            const pages = await this.browser.pages();

            for (const i in pages) {
                let p = pages[i];

                if (sharedPages.has(p)) {
                    Logger.debug('Page #' + i + ' is a shared page');
                    continue;
                }

                page = p;

                Logger.info('Use page #' + i + ' for [TASK UUID] ' + taskUuid);

                await page.goto('about:blank');
            }
        }

        if (!page) {
            Logger.info('Create page for [TASK UUID] ' + taskUuid);
            page = await this.browser.newPage();
        }

        this.pages.set(taskUuid, page);

        if (!acquireSharedPage) {
            // To prevent the headless browser from being detected.
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
            });
        }

        this.printStatus();

        return page;

        } finally { unlock(); }
    }

    async releasePage(taskUuid: string, releaseSharedPage?: string) {
        const unlock = await this.mtx.acquire();
        try {

        let page = this.pages.get(taskUuid);
        if (!page) {
            Logger.error('Tried to release page for unknown [TASK UUID] '
                + taskUuid);

            this.printStatus();

            return;
        }

        if (releaseSharedPage) {
            const p = this.sharedPages.get(releaseSharedPage);
            if (p) {
                Logger.error('[TASK UUID] ' + taskUuid + ' tried to release'
                    + ' [SHARED PAGE] ' + releaseSharedPage
                    + ' that is already in the shared pages.'
                );

                this.printStatus();

                throw `Page ${releaseSharedPage} already in the shared pages`;
            }

            Logger.info('Release [SHARED PAGE] ' + releaseSharedPage
                + ' [TASK UUID] ' + taskUuid);

            this.sharedPages.set(releaseSharedPage, page);
        } else {
            Logger.info('Release page [TASK UUID] ' + taskUuid);

            // Do not close the only page.
            if (this.pages.size > 1) {
                page.close();
            }
        }

        this.pages.delete(taskUuid);

        this.printStatus();

        } finally { unlock(); }
    }

    printStatus() {
        Logger.debug('Session status. Number of active pages: '
            + this.pages.size + '; released shared pages: '
            + Array.from(this.sharedPages.keys()).join(',')
        );
    }
}
