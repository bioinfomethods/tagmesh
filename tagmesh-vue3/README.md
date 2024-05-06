# TagMesh Vue2 Support

This is a library component that provides UI support for Applications using Tagmesh
with Vue3.

## Installing

Make sure you first build the core tagmesh library and pack it.

Using Node 20.x:

```
npm install
```

## Building

To build the installable library tar file:

```
rm -rf dist  && npm run build && npm pack 
```


## Using

Once you have created the installable package, you can use it by installing it
in your own application.

For example, create a basic Vue3 application with:


**Initialize the application**

Adjust the versions of tagmesh as appropriate below:

```bash
npm create vite@latest # name your_app, create as Vue JS/TS app
cd your_app
npm install ../../tagmesh-1.0.0.tgz   ../tagmesh-vue3-0.0.0.tgz  
npm install --save-dev webpack webpack-cli
```

**Add global declaration**

The global object is required by PouchDB and unfortunately is not
provisioned by that library by default. Add to your vite.config.ts/js:

```
  define: {
      global: {},
  }
```

**Create the Tag Repository **

For a Vue application, make the tag store object be reactive by 
creating it outside your component and assigning it within your
`data()` method. Then create a create a tag repository in your 
`mounted` method that uses this object to store tags. Note that
the mounted method needs to be async, as the TagRepository
requires async operations to initialise (potentially)
remote connections.

```javascript
<script>
    import { TagRepository } from 'tagmesh'                                      
                                                                                
    // Reactive object that will be used to store and update tags                
    let tag_store = {}                                                           
                                                                                 
    export default {                                                             

        // ...
        
        async mounted() {                                                        
            this.tags = await TagRepository.create('test_application', tag_store)
        },                                                                       
                                                                                 
        data() { return {                                                        
            tag_source: tag_store,                                               
            tags : null                                                          
        }}                                                                       
    }                                                                            
</script>                                                                        
```

## Add AnnotationEditor components

The TagRepository does not expose anything to your user interface. To
let the user add and edit tags, you need to:

- import the `AnnotationEditor` component and its styles:

```
import { AnnotationEditor } from 'tagmesh-vue3'
import 'tagmesh-vue3/dist/style.css'
```

- add `AnnotationEditor` elements to your template next to 
  entities the user should tag

```html
<AnnotationEditor entity='Fred' :tags="tags"></AnnotationEditor>
```

A full example looks like:

```html
<template>
    <div>
        <h2>Please add some tags below</h2>
        <AnnotationEditor entity='Fred' :tags="tags"></AnnotationEditor>
    </div>
</template>

<script>
    import { TagRepository } from 'tagmesh'                                      
    import { AnnotationEditor } from 'tagmesh-vue3'
    import 'tagmesh-vue3/dist/style.css'
                                                                                 
    // Reactive object that will be used to store and update tags                
    let tag_store = {}                                                           
                                                                                 
    export default {                                                             
                                                                                 
        components: {                                                            
            AnnotationEditor                                                     
        },                                                                       
                                                                                 
        async mounted() {                                                        
            this.tags = await TagRepository.create('test_application', tag_store)
        },                                                                       
                                                                                 
        data() { return {                                                        
            tag_source: tag_store,                                               
            tags : null                                                          
        }}                                                                       
    }                                                                            
</script>                                                                        
```

## Add main entry point

To make the application run, you need to add an entry point, in `main.js`:

```javascript
import Vue from 'vue';
import App from './App.vue';

new Vue({
  el: '#app',
  render: h => h(App)
});
```

Then you can run it with `vite`:

```
./node_modules/.bin/vite
```
