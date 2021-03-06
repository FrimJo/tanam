import { QuerySnapshot } from '@google-cloud/firestore';
import * as admin from 'firebase-admin';
import { Document, DocumentContext, PageContext, SiteContext, SiteInformation } from '../models';
import * as documentService from './document.service';
import * as systemNotificationService from './system-message.service';
export interface DocumentQueryOptions {
    limit?: number;
    orderBy?: {
        field: string,
        sortOrder: 'asc' | 'desc',
    };
}

const siteCollection = () => admin.firestore().collection('tanam').doc(process.env.GCLOUD_PROJECT);


export async function queryPageContext(documentTypeId: string, queryOpts: DocumentQueryOptions = {}) {
    console.log(`[queryPageContext] ${documentTypeId}, query=${JSON.stringify(queryOpts)}`);
    const orderByField = queryOpts.orderBy && queryOpts.orderBy.field || 'updated';
    const sortOrder = queryOpts.orderBy && queryOpts.orderBy.sortOrder || 'desc';
    const limit = queryOpts.limit || 20;

    console.log(`[queryPageContext] effective query ${JSON.stringify({ orderByField, sortOrder, limit })}`);
    let querySnap: QuerySnapshot;
    try {
        querySnap = await siteCollection()
            .collection('documents')
            .where('status', '==', 'published')
            .where('documentType', '==', documentTypeId)
            .orderBy(orderByField, sortOrder)
            .limit(limit)
            .get();

    } catch (err) {
        console.error(`[queryPageContext] ${JSON.stringify(err)}`);
        const details = err.details;
        if (details.indexOf('firestore/indexes?create')) {
            await systemNotificationService.reportMissingIndex(details);
        } else {
            await systemNotificationService.reportUnknownError(details);
        }
        
        return [];
    }

    console.log(`[queryPageContext] num results: ${querySnap.docs.length}`);

    const result = [];
    for (const doc of querySnap.docs) {
        console.log(`[queryPageContext] ${JSON.stringify(doc.data())}`);
        result.push(_toContext(doc.data() as Document));
    }

    return result;
}

export async function getPageContextById(docId: string) {
    console.log(`[getPageContextById] ${JSON.stringify(docId)}`);
    const doc = await documentService.getDocumentById(docId);
    return !!doc ? _toContext(doc) : null;
}

export async function getPageContextByUrl(url: string): Promise<PageContext> {
    console.log(`[getPageContextByUrl] ${JSON.stringify(url)}`);
    const documents = await documentService.getDocumentByUrl(url || '/');
    console.log(`[getPageContextByUrl] Number of query results: ${documents.length}`);
    return documents.length === 0 ? null : _toContext(documents[0]);
}

async function _toContext(document: Document) {
    if (!document) {
        return null;
    }
    const siteInfo = (await siteCollection().get()).data() as SiteInformation;
    const siteContext: SiteContext = {
        domain: siteInfo.primaryDomain,
        analytics: siteInfo.analytics,
        url: `https://${siteInfo.primaryDomain}`,
        theme: siteInfo.theme,
        title: siteInfo.title,
    };

    const documentContext: DocumentContext = {
        id: document.id,
        documentType: document.documentType,
        data: _normalizeData(document.data),
        title: document.title,
        standalone: document.standalone,
        url: document.standalone ? document.url : null,
        permalink: document.standalone ? `${siteContext.url}${document.url}` : null,
        revision: document.revision,
        status: document.status,
        tags: document.tags,
        created: (document.created as admin.firestore.Timestamp).toDate(),
        updated: (document.updated as admin.firestore.Timestamp).toDate(),
        published: !!document.published
            ? (document.published as admin.firestore.Timestamp).toDate()
            : null,
    } as DocumentContext;

    return {
        document: documentContext,
        site: siteContext,
    } as PageContext;
}

function _normalizeData(data: any) {
    for (const key in data) {
        const val = data[key];
        if (val && val.toDate) {
            // Applies to Firestore timestamps
            data[key] = val.toDate();
        }
    }

    return data;
}
