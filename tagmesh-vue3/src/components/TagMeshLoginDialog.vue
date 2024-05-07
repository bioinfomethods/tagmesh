<template>
  <div v-if="show" class="login-form modal-mask">
      <div class="modal-wrapper">
        <div class="modal-container">
       
       <header>Login to TagMesh</header>

        <form @submit.prevent="submitLogin">
            
            <label for=username>User:</label><input type="text" placeholder="username" v-model="username">
            <label for=password>Password:</label><input type="password" placeholder="password" v-model="password">
           
            <!-- Add your form fields here -->
            <button type="submit">Submit</button>
            <button type="button" @click="cancelLogin">Cancel</button>
        </form>
        </div>
    </div>
  </div>
</template>

<style scoped>

header {
    font-weight: bold;
    margin-bottom: 14px;
    color: white;
}

form {
    margin-top: 20px;
}

label {
    margin-right: 7px;
    margin-left: 7px;
}

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
  background: linear-gradient(to bottom, #4fa94f 50%, white 50%);
}

.modal-header, .modal-footer {
  padding: 10px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
}



input, button {
    margin: 1px 3px;
}

</style>

<script lang="ts">

import { defineComponent } from 'vue'
import { TagRepository } from 'tagmesh'


export default defineComponent({
    
  props: {
      tags : TagRepository
  }, 
  
  computed: {
      show()  {
          
          // If there is no server configured, then there is nothing to connect to
          if(!this.tags?.serverURL) {
              return false
          }
          
          console.log("server url set: checking if tags connected")
          
          if(this.tags)
            console.log("Tags are there - are they connected?")
          else
            console.log("no tags: stand down")
          
           // If we are already connected, we don't need to show the login
           if(this.tags?.connected) {
              console.log("Tags are already connected: no need for login")
              return false
           }
           else {
               console.log("Tags not connected : show login")
           }
              
           // Auto login if we know the username and password already
           // if(this.username && this.password)
           //   this.submitLogin()
              
           return true
      }
  },
  
  watch: {
  },

  methods: {
    submitLogin() {
      console.log("username:", this.username);
      console.log("password:", this.password);
      this.tags?.connect(this.tags?.serverURL as string, this.username, this.password)
    },
    cancelLogin() {
      console.log("Cancelling the login")
    },

    login() {
    }
  },
  
  data() { return {
    username: '',
    password: ''
  }}
});
</script>
