/*
 * This software is licensed under the BSD 2-Clause license.
 * 
 * Copyright 2024 Simon Sadedin
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import PouchDB from 'pouchdb'

/**
 * Utility function to compute sha256 hash for secure calculation
 * of private URLs
 */
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

/** 
 * Represents a tag and associated tag metadata such as notes and color to 
 * display
 */
class Annotation {
    
    /**
     * Name of the tag
     */
    tag : string
    
    notes : string
    
    color: string
    
    constructor(tag: string, notes: string, color: string) {
        this.tag = tag
        this.notes = notes
        this.color = color
    }
}

/**
 * Type safe access to entry annotation map
 */
type EntityAnnotations = {[key : string] : Annotation}


/**
 * Represents an Entity that has annotations / tags attached to it.
 * 
 * Entities have a unique identifier, name, and set of annotations (tags).
 * This class is used to manage the identity and metadata of an entity within a system.
 */
class Entity {

    /**
     * Unique identifier for the Entity, typically set to the name initially.
     */
    id: string;

    /**
     * Human-readable name of the Entity.
     */
    name: string;
    
    /**
     * Type of the entity. Entity types are optional, but when provided will 
     * (in the future) enable linkage to a schema that can define metadata
     * about the tags that are assigned and constraints on them.
     */
    type: string|null;

    /**
     * Annotations or tags associated with the Entity.
     * 
     * This is a dictionary object where each key-value pair represents an
     * annotation or tag applied to the Entity.
     */
    tags: EntityAnnotations;

    /**
     * Constructs a new instance of the Entity class.
     * 
     * @param name The name of the entity which will also be used as the initial identifier.
     */
    constructor(name: string, type?:string) {
        this.tags = {};
        this.name = name;
        this.id = name;
        this.type = type || null
    }
}


/**
 * Options to configure the tag repository
 */
interface TagRepositoryOptions {
    /** 
     * Passed through to PouchDB constructor as configuration options
     */
    pouchAdapter : Object | null,

    /** 
     * URL of couchdb server. For access through the bundled Ngnix server,
     * use the address of server + '/db'
     */
    serverURL : string | null
}

type RepositoryEntities = {[key : string] : Entity}


/**
 * The main class for interfacing with tag mesh from end user code.
 * 
 * Provides functions to load, save, remove and update tags and their annotations
 * for a given subject. In the tagmesh model, each subject of annotations is managed
 * by a separate tag repository, and has a unique document ID under which data is
 * saved in local or remote state databases.
 * 
 * To provide secure access, TagRepository relies on cryptographically generated 
 * document ids; that is, the primary method by which a document is protected is
 * that its document id is an unguessable cryptographic identifier. Users are
 * granted access to subjects by providing them either directly with the document
 * id for the subject, or the underlying secrets needed to compute it. The root of
 * security is the <code>repositorySecretRoot</code> which is used to salt
 * all other computed secrets. This should be set once by your application and 
 * should be common across all applications that share the set of subjects
 * that are to be collaboratively annotated.
 */
class TagRepository {
    
    /** 
     * Salt used in hashing to produce unguessable document ids
     */
    static repositorySecretRoot = 'set_me_to_a_secret'

    /**
     * Prefix used for document ids - set to something specifc to your application
     * if you want multiple applications to share the same document store.
     */
    static metaDataDocumentIdRoot = 'tagmesh_metadata__'

    /**
     * The secure document id of this TagRepository
     * 
     * This is created from a salted hash of subject id and the metaDataDocumentIdRoot
     */
    metaDataDocumentId : string
    
    /** 
     * Prefix added to entities within this tag repository to ensure they are
     * unique to the subject
     */
    subject_id : string

    /**
     * All the annotations in the repository
     * 
     * This is a dictionary object where keys are entity ids and values are entities
     */
    userAnnotations : RepositoryEntities
    
    /** 
     * The URL of the server to which this TagRepository will attempt to connect
     */
    serverURL : string | null
    
    /** 
     * Internal PouchDB database used to store entities
     */
    pouch : PouchDB.Database
    
    /**
     * Remote couch db database if one is connected
     */
    couch : PouchDB.Database | null
    
    connected : boolean
    
    /**
     * Internal constructor used to create a TagRepository.
     * 
     * Typically do not use this constructor unless you want to compute secret ids for 
     * yourself. Instead, use the `create` function which automatically computes
     * secure document ids
     */
    constructor(secret_id : string, subject_id : string, annotations : RepositoryEntities, options? : TagRepositoryOptions) {
        this.metaDataDocumentId = TagRepository.metaDataDocumentIdRoot + secret_id
        this.pouch = new PouchDB(this.metaDataDocumentId, options?.pouchAdapter || {})
        this.userAnnotations = annotations
        this.subject_id = subject_id
        this.serverURL = options?.serverURL || null
        
        if(TagRepository.repositorySecretRoot == 'set_me_to_a_secret') {
            console.warn("TagRepository secret is set to the default publicly known value. Please set this to a secret value to ensure your application is secure\n" +
                          "by adding TagRepository.repositorySecretRoot='<an actual secret>' to your application code")
        }
        this.couch = null
        this.connected = false
    }
    
    /**
     * Creates a TagRepository for the given subject, using the given annotations object
     * to store annotations.
     * 
     * This method will compute a secure document id automatically based on the subject id
     * and the repositorySecretRoot.
     * 
     * @param subject_id    the unique identifier for the subject this repository is for
     * @param annotations   an object to store annotations in. You can pass a plain, empty
     *                      javascript object (`{}`), however if you are using TagMesh
     *                      in the context of an application using managed state or reactive
     *                      objects, you may wish to pass a managed / reactive object here so that
     *                      tagmesh will update your managed object with annotations.
     * @param options       Options to pass to PouchDB in its initialization to customise how
     *                      annotations are stored.
     */
    static async create(subject_id : string, annotations : RepositoryEntities, options? : TagRepositoryOptions) {

        let secret_id = await computeSHA256(TagRepository.repositorySecretRoot + '-' + subject_id)

        let repo = new TagRepository(secret_id, subject_id, annotations, options)
        
        await repo.loadState()
        
        return repo;
    }
    
    /**
     * Return the information for the entity specified by the given id
     * 
     * If there is no entity known for the id, a blank entity will be created, but not saved
     */
    get(id : string) : Entity {
        return this.userAnnotations[id] || new Entity(id)
    }

    /**
     * Save a new tag for the given entity
     */
    async saveTag({entityName, tag, notes, color, type} : 
        {entityName: string, tag: string, notes : string, color: string, type: string|null}) : Promise<Entity> {
        
        let entity : Entity = this.get(entityName)
        
        if(type)
            entity.type = type

        if (!entity.tags[tag]) {
            // Have to convert to plain object here, otherwise indexeddb can't store it
            // in pouch. How can we make that work?
            entity.tags[tag] = {...new Annotation(tag, notes, color)}
        }
        else {
            Object.assign(entity.tags[tag], {tag: tag, notes: notes, color: color, type: type} )
        }

        if(!this.userAnnotations[entity.id]) {
            this.userAnnotations[entity.id] = entity
        }

        this.saveEntity(entity.id)
        
        return entity
    }

    private getEntityKey(entityId : string) : string {
        return this.subject_id + ':' + entityId
    }

    /**
     * Saves the given entity, typically after it has been modified
     */
    private async saveEntity(entityId: string) {

        let doc : any = null
        const entityKey = this.getEntityKey(entityId)
        try {
            doc = await this.pouch.get(entityKey)

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
                _id: entityKey,
                ...this.userAnnotations[entityId]
            }
        }
        console.log("Sending doc to pouch", doc)
        this.pouch.put(doc)
    }

    private async saveMetaData(data : Object) {
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
    
    /** 
     * Remove all tags from this repository.
     */
    async clear() {
        console.log("Clearing all annotations from document")

        for(var entityId in this.userAnnotations) {
            console.log("Remove tags for entity: ", entityId)
            for(var tag in this.userAnnotations[entityId]?.tags) {
                await this.removeAnnotation(entityId, this.userAnnotations[entityId].tags[tag])
            }
        }
    }

    /**
     * Remove the annotations identified by the given tag for the given entity
     */
    async removeTag(entityId : string, tag : string) {
        this.removeAnnotation(entityId, this.get(entityId).tags[tag])
    }

    /**
     * Remove the given annotation for the given entity
     */
    async removeAnnotation(entityId : string, anno? : Annotation) {

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
    
    /**
     * Loads the TagRepository from saved state.
     * 
     * Typically you will not need to call this explicitly because it is invoked
     * when the TagRepository is created.
     */
    async loadState() : Promise<TagRepository> {
       
        let allDocs = await this.pouch.allDocs({
            include_docs:true
        })

        console.log('Got docs: ', allDocs)
        
        let entityRows = 
            allDocs
                .rows
                .filter(doc => doc.id != this.metaDataDocumentId )

        let mapped_annotations = new Map(entityRows.map(row => [row.id.split(':')[1], row.doc]))
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
      
    async connect(pouchBaseURL : string, username : string, password : string) {
        
        let dbURL = pouchBaseURL + '/' + this.metaDataDocumentId

        console.log("Connecting to server " + dbURL)
        this.couch = new PouchDB(dbURL, { auth: { "username":  username, "password": password} })
        
        await this.pouch.replicate.from(this.couch).on('complete', () => {

            console.log("Couchdb replicate complete")
            this.loadState()
            this.connected = true
            
            let sync = PouchDB.sync(this.pouch, this.couch!, {live: true, retry: true})
            sync.on('change', () => {
                console.log("Couchdb sync complete")
                this.loadState()
            })
        })
        
        console.log("Connected to server " + pouchBaseURL)
    }
}

export { TagRepository, Entity, Annotation }
