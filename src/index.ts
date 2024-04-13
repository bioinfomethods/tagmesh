
import PouchDB from 'pouchdb'


class Annotation {
    
    tag : string
    
    notes : string
    
    color: string
    
    constructor(tag: string, notes: string, color: string) {
        this.tag = tag
        this.notes = notes
        this.color = color
    }
}

type EntryAnnotations = {[key : string] : Annotation}

class Entity {
    
    id : string

    name : string
    
    tags : EntryAnnotations
    
    constructor(name : string) {
       this.tags = {}
       this.name = name
       this.id = name
    }
}

interface TagRepositoryOptions {
    pouchAdapter : Object
}

type RepositoryEntries = {[key : string] : Entity}

async function computeSHA256(message : string) {
    // Encode the string as a Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    // Compute the hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // Convert bytes to hex string
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

class TagRepository {
    
    static repositorySecretRoot = 'b0afc20ab7fa17da5166d97442208521f3c1238e'

    metaDataDocumentIdRoot = 'tagmesh_metadata__'

    metaDataDocumentId : string

    userAnnotations : RepositoryEntries
    
    pouch : PouchDB.Database
    
    constructor(secret_id : string, subject_id : string, annotations : RepositoryEntries, options? : TagRepositoryOptions) {
        this.metaDataDocumentId = this.metaDataDocumentIdRoot + secret_id
        this.pouch = new PouchDB(this.metaDataDocumentId, options?.pouchAdapter || {})
        this.userAnnotations = annotations
    }
    
    private static async create(subject_id : string, annotations : RepositoryEntries, options? : TagRepositoryOptions) {

        let secret_id = await computeSHA256(TagRepository.repositorySecretRoot + '-' + subject_id)

        let repo = new TagRepository(secret_id, subject_id, annotations, options)
        
        await repo.loadState()
        
        return repo;
    }
    
    get(id : string) : Entity {
        return this.userAnnotations[id] || new Entity(id)
    }

    saveTag(entityName : string,  tagName: string, newTagNotes: string, color: string) : Entity {
        
        let entity : Entity = this.userAnnotations[entityName] || new Entity(entityName)

        if (!entity.tags[tagName]) {
            // Have to convert to plain object here, otherwise indexeddb can't store it
            // in pouch. How can we make that work?
            entity.tags[tagName] = {...new Annotation(tagName, newTagNotes, color)}
        }

        if(!this.userAnnotations[entity.id]) {
            this.userAnnotations[entity.id] = entity
        }

        this.saveEntity(entity.id)
        
        return entity
    }

    async saveEntity(entityId: string) {

        let doc : any = null
        try {
            doc = await this.pouch.get(entityId)

            let meta = {
                _id: doc._id,
                _rev: doc._rev
            }

            doc = {
                ...this.userAnnotations[entityId],
                ...meta
            }

            console.log('Updating existing doc', doc)
        }
        catch (e) {
            console.log(e)
            doc = {
                _id: entityId,
                ...this.userAnnotations[entityId]
            }
        }
        console.log("Sending doc to pouch", doc)
        this.pouch.put(doc)
    }

    async saveMetaData(data : Object) {
        let doc : any = null
        try {
            doc = await this.pouch.get(this.metaDataDocumentId)

            let meta = {
                _id: doc._id,
                _rev: doc._rev
            }

            doc = {
                ...data,
                ...meta
            }

            console.log('Updating existing doc', doc)
        }
        catch (e) {
            console.log(e)
            doc = {
                ...data,
                _id: this.metaDataDocumentId,
            }
        }
        console.log("Sending doc to pouch", doc)
        this.pouch.put(doc)
    }
    
    async clear() {
        console.log("Clearing all annotations from document")

        for(var entityId in this.userAnnotations) {
            console.log("Remove tags for entity: ", entityId)
            for(var tag in this.userAnnotations[entityId]?.tags) {
                await this.removeAnnotation(entityId, this.userAnnotations[entityId].tags[tag])
            }
        }
    }

    async removeTag(entityId : string, tag : string) {
        this.removeAnnotation(entityId, this.get(entityId).tags[tag])
    }

    async removeAnnotation(entityId : string, anno? : Annotation) {

        // if (!confirm("Delete tag " + anno.tag + " with notes:\n\n" + anno.notes))
        //    return
        
        if(!anno)
            return

        if(!this.userAnnotations[entityId]) {
            console.log(`Entity ${entityId} does not have any annotations`)
            return
        }

        console.log(`Removing tag ${anno.tag} from entity ${entityId}`)

        let entity : Entity = this.userAnnotations[entityId]!
        
        delete entity.tags[anno.tag]

        await this.saveEntity(entity.id)
    }

    
    async loadState() {
       
        let allDocs = await this.pouch.allDocs({
            include_docs:true
        })

        console.log('Got docs: ', allDocs)
        
        let geneRows = 
            allDocs
                .rows
                .filter(doc => doc.id != this.metaDataDocumentId )
                
               

        let mapped_annotations = new Map(geneRows.map(row => [row.id, row.doc]))
        
        let final_annotations = Object.fromEntries(mapped_annotations.entries())
        
        console.log("Final annotations: ", final_annotations)
        
        
        for(var entityId in final_annotations) {
            
            let entity = new Entity(entityId)
            const annoEntity : any = final_annotations[entityId]!
            entity.name = annoEntity.name
            entity.tags = annoEntity.tags
            this.userAnnotations[entityId] = annoEntity
        }
        
        return this;
      }
}

export { TagRepository, Entity, Annotation}