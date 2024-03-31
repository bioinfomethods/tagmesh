
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

class TagRepository {
    
    metaDataDocumentId = 'rnadx_metadata__'

    userAnnotations : RepositoryEntries
    
    pouch : PouchDB.Database
    
    constructor(annotations : RepositoryEntries, options? : TagRepositoryOptions) {
        this.pouch = new PouchDB(this.metaDataDocumentId, options?.pouchAdapter || {})
        this.userAnnotations = annotations
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

    removeTag(entityId : string, tag : Annotation) {

        if (!confirm("Delete tag " + tag.tag + " with notes:\n\n" + tag.notes))
            return

        if(!this.userAnnotations[entityId])
            return

        let entity : Entity = this.userAnnotations[entityId]!
        
        delete entity.tags[entityId]

        this.saveEntity(entity.id)
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
      }
}

export { TagRepository, Entity, Annotation}