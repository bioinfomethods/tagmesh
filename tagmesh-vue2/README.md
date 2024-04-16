# TagMesh Vue2 Support

This is a library component that provides UI support for Applications using Tagmesh
with Vue2.

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

For example, create a basic Vue2 application with:


**Initialize the application**

Adjust the versions of tagmesh as appropriate below:

```bash
mkdir tagmesh-install-test
cd tagmesh-install-test
npm init -y 
npm install vue@2 @vitejs/plugin-vue2 vue-template-compiler webpack webpack-cli 
npm install ../../tagmesh-1.0.0.tgz   ../tagmesh-vue2-0.0.0.tgz  
```

Add a minimal `vite` configuration such as:

```javascript
import createVue from '@vitejs/plugin-vue2';
                                            
export default {                            
  plugins: [createVue()],                   
                                            
  define: {                                 
      global: {},                           
  },                                        
                                            
};                                          
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
import { AnnotationEditor } from 'tagmesh-vue2'
import 'tagmesh-vue2/dist/style.css'
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
    import { AnnotationEditor } from 'tagmesh-vue2'
    import 'tagmesh-vue2/dist/style.css'
                                                                                 
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