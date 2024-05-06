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
          return (this.tags?.serverURL && !this.tags.connected)
      }
  },
  
  watch: {
  },

  methods: {
    submitLogin() {
      console.log("username:", this.username);
      console.log("password:", this.password);
      this.tags?.connect(this.tags?.serverURL as string, "john","password")
    },
    cancelLogin() {
      console.log("Cancelling the login")
    },

    login() {
    }
  },
  
  data() { return {
    username: 'john',
    password: 'password'
  }}
});
</script>
