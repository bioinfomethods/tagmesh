<template>
    <div>
        <h3>Annotation Editor Test for {{ subject }}</h3>
        
        <a href="#" @click.prevent="subject='10W000002'">10W000002</a>&nbsp;
        <a href="#" @click.prevent="subject='10W000001'">10W000001</a>
        
        <table>
            <thead>
                <tr><th>Gene</th><th>Variant</th><th>Tags</th></tr>
            </thead>
            <tbody>
                <tr v-for="v in test_data">
                    <td>{{ v.gene }}</td>
                    <td>{{ v.chr }}:{{v.pos}} {{ v.ref }}/{{ v.alt }}</td>
                    <td>
                        <AnnotationEditor v-if="tags" :tags="tags" :entity="v.gene" type="gene"></AnnotationEditor>
                    </td>
                </tr>
            </tbody>
        </table>
        <p>
        <button @click="clear">Clear</button>
        </p>
        <hr>
        
        <div>
            <TagMeshLoginDialog ref="loginDialog" :tags="tags as TagRepository"></TagMeshLoginDialog>
        </div>
    </div>
</template>

<style>
body {
    font-family: arial;
}

table {
    border-collapse: collapse; /* Ensures borders between cells are merged */
    width: 100%; /* Makes the table full width of its container */
    margin-top: 1em;
}

table th, table td {
    border: 1px solid #444; /* Sets the border for each cell */
    text-align: left; /* Aligns text to the left in each cell */
    padding: 3px; /* Sets padding inside each cell */
}

</style>

<script lang="ts" setup>

import { TagRepository } from 'tagmesh'
import AnnotationEditor from './components/AnnotationEditor.vue'
import TagMeshLoginDialog from './components/TagMeshLoginDialog.vue'
import { onMounted, reactive, ref, watch } from 'vue'

declare global {
    interface Window {
        tags: any; // Use 'any' or a more specific type as needed
    }
}

/**
 * Data
 */
let pouchBaseURL = ref('http://localhost:5288/db')
let subject = ref('10W000001')
let tag_source = reactive({})
let tags = ref<TagRepository|null>(null)
let test_data = reactive(
    [
        { gene: 'SCN5A', chr: 'chr1', pos: 12324223, ref: 'A', alt: 'T' },
        { gene: 'DVL1', chr: 'chr1', pos: 12324223, ref: 'G', alt: 'TA' },
        { gene: 'DMD', chr: 'chrX', pos: 2324223, ref: 'C', alt: 'G' },
    ]
)

interface TagMeshLoginDialog {
    username : string
    password : string
}

/**
 * Refs
 */
const loginDialog = ref<TagMeshLoginDialog|null>(null)

/**
 * Hooks
 */
onMounted( async () => {
      TagRepository.repositorySecretRoot = 'test-app-1'
      createRepository()
})

watch(subject, (_, newValue) => {
    console.log('subject updated to: ', newValue)
    
    tag_source = reactive({})
    
    const repo : TagRepository = tags.value! as TagRepository

    repo.changeSubject(subject.value, tag_source, loginDialog.value!.username, loginDialog.value!.password)
   
    // createRepository()
})


/**
 * Methods
 */
async function createRepository() {
    
  let newRepo = 
      await TagRepository.create(subject.value, tag_source, { serverURL: pouchBaseURL.value, pouchAdapter: null })

  tags.value = newRepo
        
  window.tags = tags.value
}

function clear() {
    console.log("Clearing annotations")
    tags.value?.clear()
}
</script>