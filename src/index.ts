
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

class Entity {
    
    id : string

    name : string
    
    tags : Map<string, Annotation>
    
    constructor(name : string) {
       this.tags = new Map()
       this.name = name
       this.id = name
    }
}

interface TagRepositoryOptions {
    pouchAdapter : Object
}

class TagRepository {
    
    metaDataDocumentId = 'rnadx_metadata__'

    userAnnotations : Map<string,Entity>
    
    pouch : PouchDB.Database
    
    constructor(options? : TagRepositoryOptions) {
        this.pouch = new PouchDB(this.metaDataDocumentId, options?.pouchAdapter || {})
        this.userAnnotations = new Map()
    }

    saveTag(entity: Entity, newTagName: string, newTagNotes: string, color: string) : Entity {

        if (!entity.tags) {
            entity.tags = new Map()
        }

        if (!entity.tags.has(newTagName)) {
            entity.tags.set(newTagName,new Annotation(newTagName, newTagNotes, color))
        }

        if(!this.userAnnotations.has(entity.id)) {
            this.userAnnotations.set(entity.id, entity)
        }

        //if (typeof (this.userAnnotations[tagItem.gene]) == 'undefined')
        //    Vue.set(this.userAnnotations, tagItem.gene, {})

        // Vue.set(this.userAnnotations[tagItem.gene], newTagName, {
        //    tag: newTagName,
        //    notes: newTagNotes,
        //    user: this.username,
        //    color: color.hex || color
        //})

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
                ...this.userAnnotations.get(entityId),
                ...meta
            }

            console.log('Updating existing doc', doc)
        }
        catch (e) {
            console.log(e)
            doc = {
                _id: entityId,
                ...this.userAnnotations.get(entityId)
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

        if(!this.userAnnotations.has(entityId))
            return

        let entity : Entity = this.userAnnotations.get(entityId)!
        
        entity.tags.delete(entityId)

        // Vue.delete(this.userAnnotations[item.gene], tag.tag)
        // if (Object.keys(this.userAnnotations[item.gene]).length == 0)
        //    Vue.delete(this.userAnnotations, item.gene)

        this.saveEntity(entity.id)
    }
}

/*
class TagRepository {
    
    metaDataDocumentId = 'rnadx_metadata__'

    userAnnotations : Map<string,Entity>
    
    pouch : PouchDB.Database
    
    constructor(options? : TagRepositoryOptions) {
        this.pouch = new PouchDB(this.metaDataDocumentId, options?.pouchAdapter || {})
        this.userAnnotations = new Map()
    }
}
*/

export { TagRepository, Entity, Annotation}