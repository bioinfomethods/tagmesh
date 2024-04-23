<template>
  <div class="annotationEditorOuter" v-if="tags">
    <!-- Trigger Button -->
    <span v-for="tag in tags.get(entity)?.tags">
        <slot>
                <span class="tagmesh-tag"
                     :style="{backgroundColor: tag.color}"
                     @click="editAnnotation(entity, tag)"
                     >{{ tag.tag }}</span>
        </slot>
    </span>
    <button class="tagmesh-add-annotation" @click="showDialog">Add</button>

    <!-- Modal Dialog -->
    <div v-if="showModal" class="modal-mask">
      <div class="modal-wrapper">
        <div class="modal-container">
          
          <header class="modal-header">
            <!-- Slot for custom title -->
            <h3><slot name="title">Edit Annotation for <span v-if="type">{{  type }}</span> {{ entity }} ({{ tags.subject_id }})</slot></h3>
          </header>

          <div class="modal-body">
            <form>

              <label for="tag">Name:</label>
              <input type="text" id="tag" ref="tagName" v-model="editedAnnotation.tag">
              
              <label for="color">Color:</label>
              <input type="color" id="color" v-model="editedAnnotation.color">
              
              <div class="tagNotes">
                  <label for="notes">Notes:</label>
                  <textarea id="notes" v-model="editedAnnotation.notes"></textarea>                  
              </div>
            </form>
          </div>
          
          <footer class="modal-footer">
            <button @click="saveData">Save</button>
            <button @click="hideDialog">Cancel</button>
            <button @click="removeEditedAnnotation()">Remove Tag</button>
          </footer>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  color: #222;
}

.modal-wrapper {
  max-width: 90%;
  max-height: 90%;
  overflow-y: visible;
}

.modal-container {
  background: white;
  padding: 10px;
  border-radius: 3px;
  box-shadow: 10px 10px 20px rgba(0, 0, 0, 0.5);
}

.modal-header, .modal-footer {
  padding: 10px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
}

label, input {
    margin: 0.5em 0.5em;
}

form {
    caret-color: black; 
}

button {
    border-color: #eee;
    border-radius: 4px;
    margin: 2px 3px;
    padding: 1px 3px;
    background-color: #eee;  
    cursor: pointer;
    line-height: 1.5em;
    color: #222;
}

button:hover {
    background-color: #ddd; /* Slightly darker shade of green */
}

input, textarea {
    border-style: solid;
    border-color: #ccc;
    border-radius: 4px;    
}

.tagNotes label {
    vertical-align: top;
}

textarea {
    height: 6em;
    width: 20em;
}

h3 {
    font-weight: 600;
    margin: 0 0.3em 0 0;
}

.annotationEditorOuter {
    font-size: 11px;
}

.tagmesh-tag {                                                                                                                                                                                                                                                                                                                                 
    background-color: red;
    border-radius: 5px;
    color: white;
    display: inline;
    padding: 3px 5px;
    font-size: 75%;
    margin: 3px;
    cursor: pointer;
    
}

.tagmesh-add-annotation {
    font-size: 9px;
}
</style>


<script>

import Vue from 'vue'

export default {

  name: 'AnnotationEditor',
  
  props: ['tags', 'entity', 'type'],
  
  components: {
  },

  data() {
    return {
      showModal: false,
      editedAnnotation: {
        tag: '',
        color: '#0000ff', // Default color black
        notes: ''
      },
    };
  },

  methods: {
      showDialog() {
         this.showModal = true         
         document.addEventListener('keydown', this.handleEscape);
         this.$nextTick(() => this.$refs.tagName.focus())
      },
      
      hideDialog() {
          this.showModal = false;

          // Clean up the global key listener
          document.removeEventListener('keydown', this.handleEscape);
      },      
      
      handleEscape(e) {
        if (e.key === 'Escape') {
            this.hideDialog();
        }
      },      
      
      editAnnotation(entityId, tag) {
          Vue.set(this.editedAnnotation, 'tag', tag.tag)
          Vue.set(this.editedAnnotation, 'notes', tag.notes)
          Vue.set(this.editedAnnotation, 'color', tag.color)
          Vue.set(this.editedAnnotation, 'type', tag.type)
          
          this.showDialog()
      },
      
      async removeEditedAnnotation(entityId, tag) {
          await this.tags.removeAnnotation(this.entity, this.editedAnnotation)
          this.showModal = false
      },

      saveData() {
        // Here we would handle the save operation
        console.log('Saving data:', this.editedAnnotation);
        
        let data = {entityName: this.entity, ...this.editedAnnotation}
        if(this.type)
            data.type = this.type
        this.tags.saveTag(data)
        
        this.hideDialog()
      },
      
      destroyed() {
        document.removeEventListener('keydown', this.handleEscape);
      }
  }
}
</script>

