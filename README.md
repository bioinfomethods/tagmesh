# TagMesh

TagMesh is a library to enable easy and simple collaboration across
different projects by allowing tags and notes to be added to arbitrary
entities and then shared across projects.

This library is the core library that provides base level support that is
independent of any user interface library or framework. In practice, you will
probably want to also install a UI support library so that TagMesh
works seamlessly (either Vue, or React).

## Building

TagMesh is built using Node v20.x. First ensure that you have this 
installed before proceeding.

Then you can build it as a regular NPM package:

```
npm install
npm run build
```

To actually use TagMesh, refer to one of the UI support libraries, such as
[tagmesh-vue2](tagmesh-vue2).


