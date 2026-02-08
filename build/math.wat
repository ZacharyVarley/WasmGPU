(module $wasmgpu_math.wasm
  (type (;0;) (func (param i32 i32) (result i32)))
  (type (;1;) (func (param i32 i32 i32) (result i32)))
  (type (;2;) (func (param i32 i32)))
  (type (;3;) (func (param i32) (result f32)))
  (type (;4;) (func (param i32) (result i32)))
  (type (;5;) (func (param i32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32) (result i32)))
  (type (;6;) (func (param i32 i32 i32 i32) (result i32)))
  (type (;7;) (func (param i32 f32 f32 f32 f32) (result i32)))
  (type (;8;) (func (param i32)))
  (type (;9;) (func (param i32 f32 f32) (result i32)))
  (type (;10;) (func (param i32 i32 f32) (result i32)))
  (type (;11;) (func (param i32 i32) (result f32)))
  (type (;12;) (func (param i32 i32 i32 f32) (result i32)))
  (type (;13;) (func (param i32 i32 i32 i32 i32) (result i32)))
  (type (;14;) (func (param i32 i32 i32)))
  (type (;15;) (func (param i32 f32 f32 f32) (result i32)))
  (type (;16;) (func (param i32 i32 f32 f32 f32) (result i32)))
  (type (;17;) (func (result i32)))
  (type (;18;) (func))
  (type (;19;) (func (param i32 i32 i32 i32)))
  (type (;20;) (func (param i32 i32 i32 i32 i32 i32) (result i32)))
  (type (;21;) (func (param f32) (result f32)))
  (func $mat4_abs (type 0) (param i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    f32.abs
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    f32.abs
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    f32.abs
    f32.store offset=8
    local.get 0
    local.get 1
    f32.load offset=12
    f32.abs
    f32.store offset=12
    local.get 0
    local.get 1
    f32.load offset=16
    f32.abs
    f32.store offset=16
    local.get 0
    local.get 1
    f32.load offset=20
    f32.abs
    f32.store offset=20
    local.get 0
    local.get 1
    f32.load offset=24
    f32.abs
    f32.store offset=24
    local.get 0
    local.get 1
    f32.load offset=28
    f32.abs
    f32.store offset=28
    local.get 0
    local.get 1
    f32.load offset=32
    f32.abs
    f32.store offset=32
    local.get 0
    local.get 1
    f32.load offset=36
    f32.abs
    f32.store offset=36
    local.get 0
    local.get 1
    f32.load offset=40
    f32.abs
    f32.store offset=40
    local.get 0
    local.get 1
    f32.load offset=44
    f32.abs
    f32.store offset=44
    local.get 0
    local.get 1
    f32.load offset=48
    f32.abs
    f32.store offset=48
    local.get 0
    local.get 1
    f32.load offset=52
    f32.abs
    f32.store offset=52
    local.get 0
    local.get 1
    f32.load offset=56
    f32.abs
    f32.store offset=56
    local.get 0
    local.get 1
    f32.load offset=60
    f32.abs
    f32.store offset=60
    i32.const 0)
  (func $mat4_add (type 1) (param i32 i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    local.get 2
    f32.load
    f32.add
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    local.get 2
    f32.load offset=4
    f32.add
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    local.get 2
    f32.load offset=8
    f32.add
    f32.store offset=8
    local.get 0
    local.get 1
    f32.load offset=12
    local.get 2
    f32.load offset=12
    f32.add
    f32.store offset=12
    local.get 0
    local.get 1
    f32.load offset=16
    local.get 2
    f32.load offset=16
    f32.add
    f32.store offset=16
    local.get 0
    local.get 1
    f32.load offset=20
    local.get 2
    f32.load offset=20
    f32.add
    f32.store offset=20
    local.get 0
    local.get 1
    f32.load offset=24
    local.get 2
    f32.load offset=24
    f32.add
    f32.store offset=24
    local.get 0
    local.get 1
    f32.load offset=28
    local.get 2
    f32.load offset=28
    f32.add
    f32.store offset=28
    local.get 0
    local.get 1
    f32.load offset=32
    local.get 2
    f32.load offset=32
    f32.add
    f32.store offset=32
    local.get 0
    local.get 1
    f32.load offset=36
    local.get 2
    f32.load offset=36
    f32.add
    f32.store offset=36
    local.get 0
    local.get 1
    f32.load offset=40
    local.get 2
    f32.load offset=40
    f32.add
    f32.store offset=40
    local.get 0
    local.get 1
    f32.load offset=44
    local.get 2
    f32.load offset=44
    f32.add
    f32.store offset=44
    local.get 0
    local.get 1
    f32.load offset=48
    local.get 2
    f32.load offset=48
    f32.add
    f32.store offset=48
    local.get 0
    local.get 1
    f32.load offset=52
    local.get 2
    f32.load offset=52
    f32.add
    f32.store offset=52
    local.get 0
    local.get 1
    f32.load offset=56
    local.get 2
    f32.load offset=56
    f32.add
    f32.store offset=56
    local.get 0
    local.get 1
    f32.load offset=60
    local.get 2
    f32.load offset=60
    f32.add
    f32.store offset=60
    i32.const 0)
  (func $mat4_copy (type 0) (param i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    f32.store offset=8
    local.get 0
    local.get 1
    f32.load offset=12
    f32.store offset=12
    local.get 0
    local.get 1
    f32.load offset=16
    f32.store offset=16
    local.get 0
    local.get 1
    f32.load offset=20
    f32.store offset=20
    local.get 0
    local.get 1
    f32.load offset=24
    f32.store offset=24
    local.get 0
    local.get 1
    f32.load offset=28
    f32.store offset=28
    local.get 0
    local.get 1
    f32.load offset=32
    f32.store offset=32
    local.get 0
    local.get 1
    f32.load offset=36
    f32.store offset=36
    local.get 0
    local.get 1
    f32.load offset=40
    f32.store offset=40
    local.get 0
    local.get 1
    f32.load offset=44
    f32.store offset=44
    local.get 0
    local.get 1
    f32.load offset=48
    f32.store offset=48
    local.get 0
    local.get 1
    f32.load offset=52
    f32.store offset=52
    local.get 0
    local.get 1
    f32.load offset=56
    f32.store offset=56
    local.get 0
    local.get 1
    f32.load offset=60
    f32.store offset=60
    i32.const 0)
  (func $mat4_det (type 3) (param i32) (result f32)
    (local f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32)
    local.get 0
    f32.load offset=8
    local.tee 1
    local.get 0
    f32.load offset=28
    local.tee 2
    f32.mul
    local.get 0
    f32.load offset=24
    local.tee 3
    local.get 0
    f32.load offset=12
    local.tee 4
    f32.mul
    f32.sub
    local.get 0
    f32.load offset=32
    local.tee 5
    local.get 0
    f32.load offset=52
    local.tee 6
    f32.mul
    local.get 0
    f32.load offset=36
    local.tee 7
    local.get 0
    f32.load offset=48
    local.tee 8
    f32.mul
    f32.sub
    f32.mul
    local.get 0
    f32.load offset=4
    local.tee 9
    local.get 3
    f32.mul
    local.get 0
    f32.load offset=20
    local.tee 10
    local.get 1
    f32.mul
    f32.sub
    local.get 5
    local.get 0
    f32.load offset=60
    local.tee 11
    f32.mul
    local.get 8
    local.get 0
    f32.load offset=44
    local.tee 12
    f32.mul
    f32.sub
    f32.mul
    local.get 0
    f32.load
    local.tee 13
    local.get 2
    f32.mul
    local.get 0
    f32.load offset=16
    local.tee 14
    local.get 4
    f32.mul
    f32.sub
    local.get 7
    local.get 0
    f32.load offset=56
    local.tee 15
    f32.mul
    local.get 6
    local.get 0
    f32.load offset=40
    local.tee 16
    f32.mul
    f32.sub
    f32.mul
    local.get 13
    local.get 10
    f32.mul
    local.get 9
    local.get 14
    f32.mul
    f32.sub
    local.get 16
    local.get 11
    f32.mul
    local.get 15
    local.get 12
    f32.mul
    f32.sub
    f32.mul
    local.get 13
    local.get 3
    f32.mul
    local.get 14
    local.get 1
    f32.mul
    f32.sub
    local.get 7
    local.get 11
    f32.mul
    local.get 6
    local.get 12
    f32.mul
    f32.sub
    f32.mul
    f32.sub
    f32.add
    f32.add
    local.get 9
    local.get 2
    f32.mul
    local.get 10
    local.get 4
    f32.mul
    f32.sub
    local.get 5
    local.get 15
    f32.mul
    local.get 8
    local.get 16
    f32.mul
    f32.sub
    f32.mul
    f32.sub
    f32.add)
  (func $mat4_identity (type 4) (param i32) (result i32)
    local.get 0
    i64.const 0
    i64.store offset=4 align=4
    local.get 0
    i32.const 1065353216
    i32.store
    local.get 0
    i64.const 0
    i64.store offset=24 align=4
    local.get 0
    i32.const 1065353216
    i32.store offset=20
    local.get 0
    i64.const 0
    i64.store offset=44 align=4
    local.get 0
    i32.const 1065353216
    i32.store offset=40
    local.get 0
    i32.const 1065353216
    i32.store offset=60
    local.get 0
    i32.const 12
    i32.add
    i64.const 0
    i64.store align=4
    local.get 0
    i32.const 32
    i32.add
    i64.const 0
    i64.store align=4
    local.get 0
    i32.const 52
    i32.add
    i64.const 0
    i64.store align=4
    i32.const 0)
  (func $mat4_init (type 5) (param i32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32) (result i32)
    local.get 0
    local.get 16
    f32.store offset=60
    local.get 0
    local.get 15
    f32.store offset=56
    local.get 0
    local.get 14
    f32.store offset=52
    local.get 0
    local.get 13
    f32.store offset=48
    local.get 0
    local.get 12
    f32.store offset=44
    local.get 0
    local.get 11
    f32.store offset=40
    local.get 0
    local.get 10
    f32.store offset=36
    local.get 0
    local.get 9
    f32.store offset=32
    local.get 0
    local.get 8
    f32.store offset=28
    local.get 0
    local.get 7
    f32.store offset=24
    local.get 0
    local.get 6
    f32.store offset=20
    local.get 0
    local.get 5
    f32.store offset=16
    local.get 0
    local.get 4
    f32.store offset=12
    local.get 0
    local.get 3
    f32.store offset=8
    local.get 0
    local.get 2
    f32.store offset=4
    local.get 0
    local.get 1
    f32.store
    i32.const 0)
  (func $mat4_invert (type 0) (param i32 i32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32)
    f32.const 0x0p+0 (;=0;)
    local.set 2
    f32.const 0x1p+0 (;=1;)
    local.set 3
    f32.const 0x0p+0 (;=0;)
    local.set 4
    f32.const 0x0p+0 (;=0;)
    local.set 5
    f32.const 0x0p+0 (;=0;)
    local.set 6
    f32.const 0x1p+0 (;=1;)
    local.set 7
    f32.const 0x0p+0 (;=0;)
    local.set 8
    f32.const 0x0p+0 (;=0;)
    local.set 9
    f32.const 0x0p+0 (;=0;)
    local.set 10
    f32.const 0x0p+0 (;=0;)
    local.set 11
    f32.const 0x1p+0 (;=1;)
    local.set 12
    f32.const 0x0p+0 (;=0;)
    local.set 13
    f32.const 0x0p+0 (;=0;)
    local.set 14
    f32.const 0x0p+0 (;=0;)
    local.set 15
    f32.const 0x0p+0 (;=0;)
    local.set 16
    f32.const 0x1p+0 (;=1;)
    local.set 17
    block  ;; label = @1
      local.get 1
      f32.load offset=8
      local.tee 18
      local.get 1
      f32.load offset=28
      local.tee 19
      f32.mul
      local.get 1
      f32.load offset=24
      local.tee 20
      local.get 1
      f32.load offset=12
      local.tee 21
      f32.mul
      f32.sub
      local.tee 22
      local.get 1
      f32.load offset=32
      local.tee 23
      local.get 1
      f32.load offset=52
      local.tee 24
      f32.mul
      local.get 1
      f32.load offset=36
      local.tee 25
      local.get 1
      f32.load offset=48
      local.tee 26
      f32.mul
      f32.sub
      f32.mul
      local.get 1
      f32.load offset=4
      local.tee 27
      local.get 20
      f32.mul
      local.get 1
      f32.load offset=20
      local.tee 28
      local.get 18
      f32.mul
      f32.sub
      local.tee 29
      local.get 23
      local.get 1
      f32.load offset=60
      local.tee 30
      f32.mul
      local.get 26
      local.get 1
      f32.load offset=44
      local.tee 31
      f32.mul
      f32.sub
      f32.mul
      local.get 1
      f32.load
      local.tee 32
      local.get 19
      f32.mul
      local.get 1
      f32.load offset=16
      local.tee 33
      local.get 21
      f32.mul
      f32.sub
      local.get 25
      local.get 1
      f32.load offset=56
      local.tee 34
      f32.mul
      local.get 24
      local.get 1
      f32.load offset=40
      local.tee 35
      f32.mul
      f32.sub
      local.tee 36
      f32.mul
      local.get 32
      local.get 28
      f32.mul
      local.get 27
      local.get 33
      f32.mul
      f32.sub
      local.get 35
      local.get 30
      f32.mul
      local.get 34
      local.get 31
      f32.mul
      f32.sub
      local.tee 37
      f32.mul
      local.get 32
      local.get 20
      f32.mul
      local.get 33
      local.get 18
      f32.mul
      f32.sub
      local.get 25
      local.get 30
      f32.mul
      local.get 24
      local.get 31
      f32.mul
      f32.sub
      local.tee 38
      f32.mul
      f32.sub
      f32.add
      f32.add
      local.get 27
      local.get 19
      f32.mul
      local.get 28
      local.get 21
      f32.mul
      f32.sub
      local.tee 39
      local.get 23
      local.get 34
      f32.mul
      local.get 26
      local.get 35
      f32.mul
      f32.sub
      f32.mul
      f32.sub
      f32.add
      local.tee 40
      f32.const 0x0p+0 (;=0;)
      f32.eq
      br_if 0 (;@1;)
      local.get 29
      local.get 23
      f32.mul
      local.get 32
      local.get 28
      local.get 35
      f32.mul
      local.get 20
      local.get 25
      f32.mul
      f32.sub
      local.tee 5
      f32.mul
      local.get 33
      local.get 27
      local.get 35
      f32.mul
      local.get 18
      local.get 25
      f32.mul
      f32.sub
      local.tee 4
      f32.mul
      f32.sub
      f32.add
      f32.const 0x1p+0 (;=1;)
      local.get 40
      f32.div
      local.tee 17
      f32.mul
      local.set 3
      local.get 33
      local.get 27
      local.get 34
      f32.mul
      local.get 18
      local.get 24
      f32.mul
      f32.sub
      local.tee 6
      f32.mul
      local.get 32
      local.get 28
      local.get 34
      f32.mul
      local.get 20
      local.get 24
      f32.mul
      f32.sub
      local.tee 7
      f32.mul
      f32.sub
      local.get 29
      local.get 26
      f32.mul
      f32.sub
      local.get 17
      f32.mul
      local.set 2
      local.get 26
      local.get 4
      f32.mul
      local.get 32
      local.get 36
      f32.mul
      local.get 23
      local.get 6
      f32.mul
      f32.sub
      f32.add
      local.get 17
      f32.mul
      local.set 4
      local.get 23
      local.get 7
      f32.mul
      local.get 33
      local.get 36
      f32.mul
      f32.sub
      local.get 26
      local.get 5
      f32.mul
      f32.sub
      local.get 17
      f32.mul
      local.set 5
      local.get 33
      local.get 27
      local.get 31
      f32.mul
      local.get 21
      local.get 25
      f32.mul
      f32.sub
      local.tee 8
      f32.mul
      local.get 32
      local.get 28
      local.get 31
      f32.mul
      local.get 19
      local.get 25
      f32.mul
      f32.sub
      local.tee 9
      f32.mul
      f32.sub
      local.get 23
      local.get 39
      f32.mul
      f32.sub
      local.get 17
      f32.mul
      local.set 6
      local.get 39
      local.get 26
      f32.mul
      local.get 32
      local.get 28
      local.get 30
      f32.mul
      local.get 19
      local.get 24
      f32.mul
      f32.sub
      local.tee 10
      f32.mul
      local.get 33
      local.get 27
      local.get 30
      f32.mul
      local.get 21
      local.get 24
      f32.mul
      f32.sub
      local.tee 11
      f32.mul
      f32.sub
      f32.add
      local.get 17
      f32.mul
      local.set 7
      local.get 23
      local.get 11
      f32.mul
      local.get 32
      local.get 38
      f32.mul
      f32.sub
      local.get 26
      local.get 8
      f32.mul
      f32.sub
      local.get 17
      f32.mul
      local.set 8
      local.get 26
      local.get 9
      f32.mul
      local.get 33
      local.get 38
      f32.mul
      local.get 23
      local.get 10
      f32.mul
      f32.sub
      f32.add
      local.get 17
      f32.mul
      local.set 9
      local.get 23
      local.get 22
      f32.mul
      local.get 32
      local.get 20
      local.get 31
      f32.mul
      local.get 19
      local.get 35
      f32.mul
      f32.sub
      local.tee 29
      f32.mul
      local.get 33
      local.get 18
      local.get 31
      f32.mul
      local.get 21
      local.get 35
      f32.mul
      f32.sub
      local.tee 31
      f32.mul
      f32.sub
      f32.add
      local.get 17
      f32.mul
      local.set 10
      local.get 33
      local.get 18
      local.get 30
      f32.mul
      local.get 21
      local.get 34
      f32.mul
      f32.sub
      local.tee 18
      f32.mul
      local.get 32
      local.get 20
      local.get 30
      f32.mul
      local.get 19
      local.get 34
      f32.mul
      f32.sub
      local.tee 19
      f32.mul
      f32.sub
      local.get 22
      local.get 26
      f32.mul
      f32.sub
      local.get 17
      f32.mul
      local.set 11
      local.get 26
      local.get 31
      f32.mul
      local.get 32
      local.get 37
      f32.mul
      local.get 23
      local.get 18
      f32.mul
      f32.sub
      f32.add
      local.get 17
      f32.mul
      local.set 12
      local.get 23
      local.get 19
      f32.mul
      local.get 33
      local.get 37
      f32.mul
      f32.sub
      local.get 26
      local.get 29
      f32.mul
      f32.sub
      local.get 17
      f32.mul
      local.set 13
      local.get 28
      local.get 31
      f32.mul
      local.get 27
      local.get 29
      f32.mul
      f32.sub
      local.get 22
      local.get 25
      f32.mul
      f32.sub
      local.get 17
      f32.mul
      local.set 14
      local.get 24
      local.get 22
      f32.mul
      local.get 27
      local.get 19
      f32.mul
      local.get 28
      local.get 18
      f32.mul
      f32.sub
      f32.add
      local.get 17
      f32.mul
      local.set 15
      local.get 25
      local.get 18
      f32.mul
      local.get 27
      local.get 37
      f32.mul
      f32.sub
      local.get 24
      local.get 31
      f32.mul
      f32.sub
      local.get 17
      f32.mul
      local.set 16
      local.get 24
      local.get 29
      f32.mul
      local.get 28
      local.get 37
      f32.mul
      local.get 25
      local.get 19
      f32.mul
      f32.sub
      f32.add
      local.get 17
      f32.mul
      local.set 17
    end
    local.get 0
    local.get 3
    f32.store offset=60
    local.get 0
    local.get 2
    f32.store offset=56
    local.get 0
    local.get 4
    f32.store offset=52
    local.get 0
    local.get 5
    f32.store offset=48
    local.get 0
    local.get 6
    f32.store offset=44
    local.get 0
    local.get 7
    f32.store offset=40
    local.get 0
    local.get 8
    f32.store offset=36
    local.get 0
    local.get 9
    f32.store offset=32
    local.get 0
    local.get 10
    f32.store offset=28
    local.get 0
    local.get 11
    f32.store offset=24
    local.get 0
    local.get 12
    f32.store offset=20
    local.get 0
    local.get 13
    f32.store offset=16
    local.get 0
    local.get 14
    f32.store offset=12
    local.get 0
    local.get 15
    f32.store offset=8
    local.get 0
    local.get 16
    f32.store offset=4
    local.get 0
    local.get 17
    f32.store
    i32.const 0)
  (func $mat4_isEqual (type 0) (param i32 i32) (result i32)
    (local i32)
    i32.const 0
    local.set 2
    block  ;; label = @1
      local.get 0
      f32.load
      local.get 1
      f32.load
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=4
      local.get 1
      f32.load offset=4
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=8
      local.get 1
      f32.load offset=8
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=12
      local.get 1
      f32.load offset=12
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=16
      local.get 1
      f32.load offset=16
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=20
      local.get 1
      f32.load offset=20
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=24
      local.get 1
      f32.load offset=24
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=28
      local.get 1
      f32.load offset=28
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=32
      local.get 1
      f32.load offset=32
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=36
      local.get 1
      f32.load offset=36
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=40
      local.get 1
      f32.load offset=40
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=44
      local.get 1
      f32.load offset=44
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=48
      local.get 1
      f32.load offset=48
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=52
      local.get 1
      f32.load offset=52
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=56
      local.get 1
      f32.load offset=56
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=60
      local.get 1
      f32.load offset=60
      f32.ne
      br_if 0 (;@1;)
      i32.const 1
      local.set 2
    end
    local.get 2)
  (func $mat4_isIdentity (type 4) (param i32) (result i32)
    (local i32)
    i32.const 0
    local.set 1
    block  ;; label = @1
      local.get 0
      f32.load
      f32.const 0x1p+0 (;=1;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=4
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=8
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=12
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=16
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=20
      f32.const 0x1p+0 (;=1;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=24
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=28
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=32
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=36
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=40
      f32.const 0x1p+0 (;=1;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=44
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=48
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=52
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=56
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=60
      f32.const 0x1p+0 (;=1;)
      f32.ne
      br_if 0 (;@1;)
      i32.const 1
      local.set 1
    end
    local.get 1)
  (func $mat4_isInverse (type 0) (param i32 i32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32)
    f32.const 0x0p+0 (;=0;)
    local.set 2
    f32.const 0x1p+0 (;=1;)
    local.set 3
    f32.const 0x0p+0 (;=0;)
    local.set 4
    f32.const 0x0p+0 (;=0;)
    local.set 5
    f32.const 0x0p+0 (;=0;)
    local.set 6
    f32.const 0x1p+0 (;=1;)
    local.set 7
    f32.const 0x0p+0 (;=0;)
    local.set 8
    f32.const 0x0p+0 (;=0;)
    local.set 9
    f32.const 0x0p+0 (;=0;)
    local.set 10
    f32.const 0x0p+0 (;=0;)
    local.set 11
    f32.const 0x1p+0 (;=1;)
    local.set 12
    f32.const 0x0p+0 (;=0;)
    local.set 13
    f32.const 0x0p+0 (;=0;)
    local.set 14
    f32.const 0x0p+0 (;=0;)
    local.set 15
    f32.const 0x0p+0 (;=0;)
    local.set 16
    f32.const 0x1p+0 (;=1;)
    local.set 17
    block  ;; label = @1
      local.get 0
      f32.load offset=8
      local.tee 18
      local.get 0
      f32.load offset=28
      local.tee 19
      f32.mul
      local.get 0
      f32.load offset=24
      local.tee 20
      local.get 0
      f32.load offset=12
      local.tee 21
      f32.mul
      f32.sub
      local.tee 22
      local.get 0
      f32.load offset=32
      local.tee 23
      local.get 0
      f32.load offset=52
      local.tee 24
      f32.mul
      local.get 0
      f32.load offset=36
      local.tee 25
      local.get 0
      f32.load offset=48
      local.tee 26
      f32.mul
      f32.sub
      f32.mul
      local.get 0
      f32.load offset=4
      local.tee 27
      local.get 20
      f32.mul
      local.get 0
      f32.load offset=20
      local.tee 28
      local.get 18
      f32.mul
      f32.sub
      local.tee 29
      local.get 23
      local.get 0
      f32.load offset=60
      local.tee 30
      f32.mul
      local.get 26
      local.get 0
      f32.load offset=44
      local.tee 31
      f32.mul
      f32.sub
      f32.mul
      local.get 0
      f32.load
      local.tee 32
      local.get 19
      f32.mul
      local.get 0
      f32.load offset=16
      local.tee 33
      local.get 21
      f32.mul
      f32.sub
      local.get 25
      local.get 0
      f32.load offset=56
      local.tee 34
      f32.mul
      local.get 24
      local.get 0
      f32.load offset=40
      local.tee 35
      f32.mul
      f32.sub
      local.tee 36
      f32.mul
      local.get 32
      local.get 28
      f32.mul
      local.get 27
      local.get 33
      f32.mul
      f32.sub
      local.get 35
      local.get 30
      f32.mul
      local.get 34
      local.get 31
      f32.mul
      f32.sub
      local.tee 37
      f32.mul
      local.get 32
      local.get 20
      f32.mul
      local.get 33
      local.get 18
      f32.mul
      f32.sub
      local.get 25
      local.get 30
      f32.mul
      local.get 24
      local.get 31
      f32.mul
      f32.sub
      local.tee 38
      f32.mul
      f32.sub
      f32.add
      f32.add
      local.get 27
      local.get 19
      f32.mul
      local.get 28
      local.get 21
      f32.mul
      f32.sub
      local.tee 39
      local.get 23
      local.get 34
      f32.mul
      local.get 26
      local.get 35
      f32.mul
      f32.sub
      f32.mul
      f32.sub
      f32.add
      local.tee 40
      f32.const 0x0p+0 (;=0;)
      f32.eq
      br_if 0 (;@1;)
      local.get 29
      local.get 23
      f32.mul
      local.get 32
      local.get 28
      local.get 35
      f32.mul
      local.get 20
      local.get 25
      f32.mul
      f32.sub
      local.tee 16
      f32.mul
      local.get 33
      local.get 27
      local.get 35
      f32.mul
      local.get 18
      local.get 25
      f32.mul
      f32.sub
      local.tee 15
      f32.mul
      f32.sub
      f32.add
      f32.const 0x1p+0 (;=1;)
      local.get 40
      f32.div
      local.tee 17
      f32.mul
      local.set 3
      local.get 33
      local.get 27
      local.get 34
      f32.mul
      local.get 18
      local.get 24
      f32.mul
      f32.sub
      local.tee 14
      f32.mul
      local.get 32
      local.get 28
      local.get 34
      f32.mul
      local.get 20
      local.get 24
      f32.mul
      f32.sub
      local.tee 13
      f32.mul
      f32.sub
      local.get 29
      local.get 26
      f32.mul
      f32.sub
      local.get 17
      f32.mul
      local.set 2
      local.get 26
      local.get 15
      f32.mul
      local.get 32
      local.get 36
      f32.mul
      local.get 23
      local.get 14
      f32.mul
      f32.sub
      f32.add
      local.get 17
      f32.mul
      local.set 4
      local.get 23
      local.get 13
      f32.mul
      local.get 33
      local.get 36
      f32.mul
      f32.sub
      local.get 26
      local.get 16
      f32.mul
      f32.sub
      local.get 17
      f32.mul
      local.set 5
      local.get 33
      local.get 27
      local.get 31
      f32.mul
      local.get 21
      local.get 25
      f32.mul
      f32.sub
      local.tee 16
      f32.mul
      local.get 32
      local.get 28
      local.get 31
      f32.mul
      local.get 19
      local.get 25
      f32.mul
      f32.sub
      local.tee 29
      f32.mul
      f32.sub
      local.get 23
      local.get 39
      f32.mul
      f32.sub
      local.get 17
      f32.mul
      local.set 6
      local.get 39
      local.get 26
      f32.mul
      local.get 32
      local.get 28
      local.get 30
      f32.mul
      local.get 19
      local.get 24
      f32.mul
      f32.sub
      local.tee 36
      f32.mul
      local.get 33
      local.get 27
      local.get 30
      f32.mul
      local.get 21
      local.get 24
      f32.mul
      f32.sub
      local.tee 39
      f32.mul
      f32.sub
      f32.add
      local.get 17
      f32.mul
      local.set 7
      local.get 23
      local.get 39
      f32.mul
      local.get 32
      local.get 38
      f32.mul
      f32.sub
      local.get 26
      local.get 16
      f32.mul
      f32.sub
      local.get 17
      f32.mul
      local.set 8
      local.get 26
      local.get 29
      f32.mul
      local.get 33
      local.get 38
      f32.mul
      local.get 23
      local.get 36
      f32.mul
      f32.sub
      f32.add
      local.get 17
      f32.mul
      local.set 9
      local.get 23
      local.get 22
      f32.mul
      local.get 32
      local.get 20
      local.get 31
      f32.mul
      local.get 19
      local.get 35
      f32.mul
      f32.sub
      local.tee 29
      f32.mul
      local.get 33
      local.get 18
      local.get 31
      f32.mul
      local.get 21
      local.get 35
      f32.mul
      f32.sub
      local.tee 31
      f32.mul
      f32.sub
      f32.add
      local.get 17
      f32.mul
      local.set 10
      local.get 33
      local.get 18
      local.get 30
      f32.mul
      local.get 21
      local.get 34
      f32.mul
      f32.sub
      local.tee 18
      f32.mul
      local.get 32
      local.get 20
      local.get 30
      f32.mul
      local.get 19
      local.get 34
      f32.mul
      f32.sub
      local.tee 19
      f32.mul
      f32.sub
      local.get 22
      local.get 26
      f32.mul
      f32.sub
      local.get 17
      f32.mul
      local.set 11
      local.get 26
      local.get 31
      f32.mul
      local.get 32
      local.get 37
      f32.mul
      local.get 23
      local.get 18
      f32.mul
      f32.sub
      f32.add
      local.get 17
      f32.mul
      local.set 12
      local.get 23
      local.get 19
      f32.mul
      local.get 33
      local.get 37
      f32.mul
      f32.sub
      local.get 26
      local.get 29
      f32.mul
      f32.sub
      local.get 17
      f32.mul
      local.set 13
      local.get 28
      local.get 31
      f32.mul
      local.get 27
      local.get 29
      f32.mul
      f32.sub
      local.get 22
      local.get 25
      f32.mul
      f32.sub
      local.get 17
      f32.mul
      local.set 14
      local.get 24
      local.get 22
      f32.mul
      local.get 27
      local.get 19
      f32.mul
      local.get 28
      local.get 18
      f32.mul
      f32.sub
      f32.add
      local.get 17
      f32.mul
      local.set 15
      local.get 25
      local.get 18
      f32.mul
      local.get 27
      local.get 37
      f32.mul
      f32.sub
      local.get 24
      local.get 31
      f32.mul
      f32.sub
      local.get 17
      f32.mul
      local.set 16
      local.get 24
      local.get 29
      f32.mul
      local.get 28
      local.get 37
      f32.mul
      local.get 25
      local.get 19
      f32.mul
      f32.sub
      f32.add
      local.get 17
      f32.mul
      local.set 17
    end
    block  ;; label = @1
      local.get 17
      local.get 1
      f32.load
      f32.ne
      br_if 0 (;@1;)
      local.get 16
      local.get 1
      f32.load offset=4
      f32.ne
      br_if 0 (;@1;)
      local.get 15
      local.get 1
      f32.load offset=8
      f32.ne
      br_if 0 (;@1;)
      local.get 14
      local.get 1
      f32.load offset=12
      f32.ne
      br_if 0 (;@1;)
      local.get 13
      local.get 1
      f32.load offset=16
      f32.ne
      br_if 0 (;@1;)
      local.get 12
      local.get 1
      f32.load offset=20
      f32.ne
      br_if 0 (;@1;)
      local.get 11
      local.get 1
      f32.load offset=24
      f32.ne
      br_if 0 (;@1;)
      local.get 10
      local.get 1
      f32.load offset=28
      f32.ne
      br_if 0 (;@1;)
      local.get 9
      local.get 1
      f32.load offset=32
      f32.ne
      br_if 0 (;@1;)
      local.get 8
      local.get 1
      f32.load offset=36
      f32.ne
      br_if 0 (;@1;)
      local.get 7
      local.get 1
      f32.load offset=40
      f32.ne
      br_if 0 (;@1;)
      local.get 6
      local.get 1
      f32.load offset=44
      f32.ne
      br_if 0 (;@1;)
      local.get 5
      local.get 1
      f32.load offset=48
      f32.ne
      br_if 0 (;@1;)
      local.get 4
      local.get 1
      f32.load offset=52
      f32.ne
      br_if 0 (;@1;)
      local.get 2
      local.get 1
      f32.load offset=56
      f32.ne
      br_if 0 (;@1;)
      local.get 3
      local.get 1
      f32.load offset=60
      f32.ne
      br_if 0 (;@1;)
      i32.const 1
      return
    end
    i32.const 0)
  (func $mat4_isZero (type 4) (param i32) (result i32)
    (local i32)
    i32.const 0
    local.set 1
    block  ;; label = @1
      local.get 0
      f32.load
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=4
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=8
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=12
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=16
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=20
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=24
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=28
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=32
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=36
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=40
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=44
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=48
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=52
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=56
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=60
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      i32.const 1
      local.set 1
    end
    local.get 1)
  (func $mat4_lookAt (type 6) (param i32 i32 i32 i32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32 f32 f32)
    local.get 3
    f32.load offset=4
    local.set 4
    local.get 3
    f32.load
    local.set 5
    local.get 3
    f32.load offset=8
    local.set 6
    local.get 1
    f32.load offset=8
    local.set 7
    local.get 2
    f32.load offset=8
    local.set 8
    local.get 1
    f32.load
    local.set 9
    local.get 2
    f32.load
    local.set 10
    local.get 1
    f32.load offset=4
    local.set 11
    local.get 2
    f32.load offset=4
    local.set 12
    local.get 0
    i32.const 0
    i32.store offset=44
    local.get 0
    i32.const 0
    i32.store offset=28
    local.get 0
    i32.const 0
    i32.store offset=12
    local.get 0
    local.get 8
    local.get 7
    f32.sub
    local.tee 7
    local.get 10
    local.get 9
    f32.sub
    local.tee 9
    local.get 9
    f32.mul
    local.get 12
    local.get 11
    f32.sub
    local.tee 8
    local.get 8
    f32.mul
    f32.add
    local.get 7
    local.get 7
    f32.mul
    f32.add
    f32.sqrt
    local.tee 10
    f32.div
    local.tee 7
    f32.neg
    f32.store offset=40
    local.get 0
    local.get 8
    local.get 10
    f32.div
    local.tee 8
    f32.neg
    f32.store offset=24
    local.get 0
    local.get 9
    local.get 10
    f32.div
    local.tee 9
    f32.neg
    f32.store offset=8
    local.get 0
    local.get 4
    local.get 9
    f32.mul
    local.get 5
    local.get 8
    f32.mul
    f32.sub
    local.tee 10
    local.get 10
    local.get 10
    f32.mul
    local.get 6
    local.get 8
    f32.mul
    local.get 4
    local.get 7
    f32.mul
    f32.sub
    local.tee 10
    local.get 10
    f32.mul
    local.get 5
    local.get 7
    f32.mul
    local.get 6
    local.get 9
    f32.mul
    f32.sub
    local.tee 5
    local.get 5
    f32.mul
    f32.add
    f32.add
    f32.sqrt
    local.tee 6
    f32.div
    local.tee 4
    f32.store offset=32
    local.get 0
    local.get 5
    local.get 6
    f32.div
    local.tee 5
    f32.store offset=16
    local.get 0
    local.get 10
    local.get 6
    f32.div
    local.tee 6
    f32.store
    local.get 0
    local.get 8
    local.get 6
    f32.mul
    local.get 9
    local.get 5
    f32.mul
    f32.sub
    local.tee 10
    f32.store offset=36
    local.get 0
    local.get 9
    local.get 4
    f32.mul
    local.get 7
    local.get 6
    f32.mul
    f32.sub
    local.tee 11
    f32.store offset=20
    local.get 0
    local.get 7
    local.get 5
    f32.mul
    local.get 8
    local.get 4
    f32.mul
    f32.sub
    local.tee 12
    f32.store offset=4
    local.get 0
    local.get 6
    local.get 1
    f32.load
    f32.mul
    local.get 5
    local.get 1
    f32.load offset=4
    f32.mul
    f32.add
    local.get 4
    local.get 1
    f32.load offset=8
    f32.mul
    f32.add
    f32.neg
    f32.store offset=48
    local.get 0
    local.get 12
    local.get 1
    f32.load
    f32.mul
    local.get 11
    local.get 1
    f32.load offset=4
    f32.mul
    f32.add
    local.get 10
    local.get 1
    f32.load offset=8
    f32.mul
    f32.add
    f32.neg
    f32.store offset=52
    local.get 1
    f32.load offset=8
    local.set 4
    local.get 1
    f32.load
    local.set 5
    local.get 1
    f32.load offset=4
    local.set 6
    local.get 0
    i32.const 1065353216
    i32.store offset=60
    local.get 0
    local.get 9
    local.get 5
    f32.mul
    local.get 8
    local.get 6
    f32.mul
    f32.add
    local.get 7
    local.get 4
    f32.mul
    f32.add
    f32.store offset=56
    i32.const 0)
  (func $mat4_mul (type 1) (param i32 i32 i32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32)
    local.get 2
    f32.load offset=12
    local.set 3
    local.get 2
    f32.load offset=8
    local.set 4
    local.get 2
    f32.load
    local.set 5
    local.get 2
    f32.load offset=4
    local.set 6
    local.get 2
    f32.load offset=28
    local.set 7
    local.get 2
    f32.load offset=24
    local.set 8
    local.get 2
    f32.load offset=16
    local.set 9
    local.get 2
    f32.load offset=20
    local.set 10
    local.get 2
    f32.load offset=44
    local.set 11
    local.get 2
    f32.load offset=40
    local.set 12
    local.get 2
    f32.load offset=32
    local.set 13
    local.get 2
    f32.load offset=36
    local.set 14
    local.get 1
    f32.load offset=48
    local.set 15
    local.get 1
    f32.load offset=32
    local.set 16
    local.get 1
    f32.load
    local.set 17
    local.get 1
    f32.load offset=16
    local.set 18
    local.get 1
    f32.load offset=52
    local.set 19
    local.get 1
    f32.load offset=36
    local.set 20
    local.get 1
    f32.load offset=4
    local.set 21
    local.get 1
    f32.load offset=20
    local.set 22
    local.get 1
    f32.load offset=56
    local.set 23
    local.get 1
    f32.load offset=40
    local.set 24
    local.get 1
    f32.load offset=8
    local.set 25
    local.get 1
    f32.load offset=24
    local.set 26
    local.get 0
    local.get 1
    f32.load offset=12
    local.tee 27
    local.get 2
    f32.load offset=48
    local.tee 28
    f32.mul
    local.get 1
    f32.load offset=28
    local.tee 29
    local.get 2
    f32.load offset=52
    local.tee 30
    f32.mul
    f32.add
    local.get 1
    f32.load offset=44
    local.tee 31
    local.get 2
    f32.load offset=56
    local.tee 32
    f32.mul
    f32.add
    local.get 1
    f32.load offset=60
    local.tee 33
    local.get 2
    f32.load offset=60
    local.tee 34
    f32.mul
    f32.add
    f32.store offset=60
    local.get 0
    local.get 25
    local.get 28
    f32.mul
    local.get 26
    local.get 30
    f32.mul
    f32.add
    local.get 24
    local.get 32
    f32.mul
    f32.add
    local.get 23
    local.get 34
    f32.mul
    f32.add
    f32.store offset=56
    local.get 0
    local.get 21
    local.get 28
    f32.mul
    local.get 22
    local.get 30
    f32.mul
    f32.add
    local.get 20
    local.get 32
    f32.mul
    f32.add
    local.get 19
    local.get 34
    f32.mul
    f32.add
    f32.store offset=52
    local.get 0
    local.get 17
    local.get 28
    f32.mul
    local.get 18
    local.get 30
    f32.mul
    f32.add
    local.get 16
    local.get 32
    f32.mul
    f32.add
    local.get 15
    local.get 34
    f32.mul
    f32.add
    f32.store offset=48
    local.get 0
    local.get 27
    local.get 13
    f32.mul
    local.get 29
    local.get 14
    f32.mul
    f32.add
    local.get 31
    local.get 12
    f32.mul
    f32.add
    local.get 33
    local.get 11
    f32.mul
    f32.add
    f32.store offset=44
    local.get 0
    local.get 25
    local.get 13
    f32.mul
    local.get 26
    local.get 14
    f32.mul
    f32.add
    local.get 24
    local.get 12
    f32.mul
    f32.add
    local.get 23
    local.get 11
    f32.mul
    f32.add
    f32.store offset=40
    local.get 0
    local.get 21
    local.get 13
    f32.mul
    local.get 22
    local.get 14
    f32.mul
    f32.add
    local.get 20
    local.get 12
    f32.mul
    f32.add
    local.get 19
    local.get 11
    f32.mul
    f32.add
    f32.store offset=36
    local.get 0
    local.get 17
    local.get 13
    f32.mul
    local.get 18
    local.get 14
    f32.mul
    f32.add
    local.get 16
    local.get 12
    f32.mul
    f32.add
    local.get 15
    local.get 11
    f32.mul
    f32.add
    f32.store offset=32
    local.get 0
    local.get 27
    local.get 9
    f32.mul
    local.get 29
    local.get 10
    f32.mul
    f32.add
    local.get 31
    local.get 8
    f32.mul
    f32.add
    local.get 33
    local.get 7
    f32.mul
    f32.add
    f32.store offset=28
    local.get 0
    local.get 25
    local.get 9
    f32.mul
    local.get 26
    local.get 10
    f32.mul
    f32.add
    local.get 24
    local.get 8
    f32.mul
    f32.add
    local.get 23
    local.get 7
    f32.mul
    f32.add
    f32.store offset=24
    local.get 0
    local.get 21
    local.get 9
    f32.mul
    local.get 22
    local.get 10
    f32.mul
    f32.add
    local.get 20
    local.get 8
    f32.mul
    f32.add
    local.get 19
    local.get 7
    f32.mul
    f32.add
    f32.store offset=20
    local.get 0
    local.get 17
    local.get 9
    f32.mul
    local.get 18
    local.get 10
    f32.mul
    f32.add
    local.get 16
    local.get 8
    f32.mul
    f32.add
    local.get 15
    local.get 7
    f32.mul
    f32.add
    f32.store offset=16
    local.get 0
    local.get 5
    local.get 27
    f32.mul
    local.get 6
    local.get 29
    f32.mul
    f32.add
    local.get 4
    local.get 31
    f32.mul
    f32.add
    local.get 3
    local.get 33
    f32.mul
    f32.add
    f32.store offset=12
    local.get 0
    local.get 5
    local.get 25
    f32.mul
    local.get 6
    local.get 26
    f32.mul
    f32.add
    local.get 4
    local.get 24
    f32.mul
    f32.add
    local.get 3
    local.get 23
    f32.mul
    f32.add
    f32.store offset=8
    local.get 0
    local.get 5
    local.get 21
    f32.mul
    local.get 6
    local.get 22
    f32.mul
    f32.add
    local.get 4
    local.get 20
    f32.mul
    f32.add
    local.get 3
    local.get 19
    f32.mul
    f32.add
    f32.store offset=4
    local.get 0
    local.get 17
    local.get 5
    f32.mul
    local.get 18
    local.get 6
    f32.mul
    f32.add
    local.get 16
    local.get 4
    f32.mul
    f32.add
    local.get 15
    local.get 3
    f32.mul
    f32.add
    f32.store
    i32.const 0)
  (func $mat4_mul_vec4 (type 1) (param i32 i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    local.get 2
    f32.load
    f32.mul
    local.get 1
    f32.load offset=16
    local.get 2
    f32.load offset=4
    f32.mul
    f32.add
    local.get 1
    f32.load offset=32
    local.get 2
    f32.load offset=8
    f32.mul
    f32.add
    local.get 1
    f32.load offset=48
    local.get 2
    f32.load offset=12
    f32.mul
    f32.add
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    local.get 2
    f32.load
    f32.mul
    local.get 1
    f32.load offset=20
    local.get 2
    f32.load offset=4
    f32.mul
    f32.add
    local.get 1
    f32.load offset=36
    local.get 2
    f32.load offset=8
    f32.mul
    f32.add
    local.get 1
    f32.load offset=52
    local.get 2
    f32.load offset=12
    f32.mul
    f32.add
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    local.get 2
    f32.load
    f32.mul
    local.get 1
    f32.load offset=24
    local.get 2
    f32.load offset=4
    f32.mul
    f32.add
    local.get 1
    f32.load offset=40
    local.get 2
    f32.load offset=8
    f32.mul
    f32.add
    local.get 1
    f32.load offset=56
    local.get 2
    f32.load offset=12
    f32.mul
    f32.add
    f32.store offset=8
    local.get 0
    local.get 1
    f32.load offset=12
    local.get 2
    f32.load
    f32.mul
    local.get 1
    f32.load offset=28
    local.get 2
    f32.load offset=4
    f32.mul
    f32.add
    local.get 1
    f32.load offset=44
    local.get 2
    f32.load offset=8
    f32.mul
    f32.add
    local.get 1
    f32.load offset=60
    local.get 2
    f32.load offset=12
    f32.mul
    f32.add
    f32.store offset=12
    i32.const 0)
  (func $mat4_neg (type 0) (param i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    f32.neg
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    f32.neg
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    f32.neg
    f32.store offset=8
    local.get 0
    local.get 1
    f32.load offset=12
    f32.neg
    f32.store offset=12
    local.get 0
    local.get 1
    f32.load offset=16
    f32.neg
    f32.store offset=16
    local.get 0
    local.get 1
    f32.load offset=20
    f32.neg
    f32.store offset=20
    local.get 0
    local.get 1
    f32.load offset=24
    f32.neg
    f32.store offset=24
    local.get 0
    local.get 1
    f32.load offset=28
    f32.neg
    f32.store offset=28
    local.get 0
    local.get 1
    f32.load offset=32
    f32.neg
    f32.store offset=32
    local.get 0
    local.get 1
    f32.load offset=36
    f32.neg
    f32.store offset=36
    local.get 0
    local.get 1
    f32.load offset=40
    f32.neg
    f32.store offset=40
    local.get 0
    local.get 1
    f32.load offset=44
    f32.neg
    f32.store offset=44
    local.get 0
    local.get 1
    f32.load offset=48
    f32.neg
    f32.store offset=48
    local.get 0
    local.get 1
    f32.load offset=52
    f32.neg
    f32.store offset=52
    local.get 0
    local.get 1
    f32.load offset=56
    f32.neg
    f32.store offset=56
    local.get 0
    local.get 1
    f32.load offset=60
    f32.neg
    f32.store offset=60
    i32.const 0)
  (func $mat4_norm (type 3) (param i32) (result f32)
    (local f32)
    local.get 0
    f32.load
    local.tee 1
    local.get 1
    f32.mul
    local.get 0
    f32.load offset=4
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=8
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=12
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=16
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=20
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=24
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=28
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=32
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=36
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=40
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=44
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=48
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=52
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=56
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=60
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    f32.sqrt)
  (func $mat4_normalize (type 0) (param i32 i32) (result i32)
    (local f32 f32)
    block  ;; label = @1
      block  ;; label = @2
        local.get 1
        f32.load
        local.tee 2
        local.get 2
        f32.mul
        local.get 1
        f32.load offset=4
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.get 1
        f32.load offset=8
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.get 1
        f32.load offset=12
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.get 1
        f32.load offset=16
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.get 1
        f32.load offset=20
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.get 1
        f32.load offset=24
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.get 1
        f32.load offset=28
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.get 1
        f32.load offset=32
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.get 1
        f32.load offset=36
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.get 1
        f32.load offset=40
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.get 1
        f32.load offset=44
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.get 1
        f32.load offset=48
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.get 1
        f32.load offset=52
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.get 1
        f32.load offset=56
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.get 1
        f32.load offset=60
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.tee 3
        f32.const 0x0p+0 (;=0;)
        f32.eq
        br_if 0 (;@2;)
        local.get 0
        f32.const 0x1p+0 (;=1;)
        local.get 3
        f32.sqrt
        f32.div
        local.tee 3
        local.get 2
        f32.mul
        f32.store
        local.get 0
        local.get 3
        local.get 1
        f32.load offset=4
        f32.mul
        f32.store offset=4
        local.get 0
        local.get 3
        local.get 1
        f32.load offset=8
        f32.mul
        f32.store offset=8
        local.get 0
        local.get 3
        local.get 1
        f32.load offset=12
        f32.mul
        f32.store offset=12
        local.get 0
        local.get 3
        local.get 1
        f32.load offset=16
        f32.mul
        f32.store offset=16
        local.get 0
        local.get 3
        local.get 1
        f32.load offset=20
        f32.mul
        f32.store offset=20
        local.get 0
        local.get 3
        local.get 1
        f32.load offset=24
        f32.mul
        f32.store offset=24
        local.get 0
        local.get 3
        local.get 1
        f32.load offset=28
        f32.mul
        f32.store offset=28
        local.get 0
        local.get 3
        local.get 1
        f32.load offset=32
        f32.mul
        f32.store offset=32
        local.get 0
        local.get 3
        local.get 1
        f32.load offset=36
        f32.mul
        f32.store offset=36
        local.get 0
        local.get 3
        local.get 1
        f32.load offset=40
        f32.mul
        f32.store offset=40
        local.get 0
        local.get 3
        local.get 1
        f32.load offset=44
        f32.mul
        f32.store offset=44
        local.get 0
        local.get 3
        local.get 1
        f32.load offset=48
        f32.mul
        f32.store offset=48
        local.get 0
        local.get 3
        local.get 1
        f32.load offset=52
        f32.mul
        f32.store offset=52
        local.get 0
        local.get 3
        local.get 1
        f32.load offset=56
        f32.mul
        f32.store offset=56
        local.get 3
        local.get 1
        f32.load offset=60
        f32.mul
        local.set 3
        br 1 (;@1;)
      end
      local.get 0
      i64.const 0
      i64.store offset=4 align=4
      local.get 0
      i32.const 1065353216
      i32.store
      local.get 0
      i64.const 0
      i64.store offset=24 align=4
      local.get 0
      i32.const 1065353216
      i32.store offset=20
      local.get 0
      i64.const 0
      i64.store offset=44 align=4
      local.get 0
      i32.const 1065353216
      i32.store offset=40
      local.get 0
      i32.const 12
      i32.add
      i64.const 0
      i64.store align=4
      local.get 0
      i32.const 32
      i32.add
      i64.const 0
      i64.store align=4
      local.get 0
      i32.const 52
      i32.add
      i64.const 0
      i64.store align=4
      f32.const 0x1p+0 (;=1;)
      local.set 3
    end
    local.get 0
    local.get 3
    f32.store offset=60
    i32.const 0)
  (func $mat4_normsq (type 3) (param i32) (result f32)
    (local f32)
    local.get 0
    f32.load
    local.tee 1
    local.get 1
    f32.mul
    local.get 0
    f32.load offset=4
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=8
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=12
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=16
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=20
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=24
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=28
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=32
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=36
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=40
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=44
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=48
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=52
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=56
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=60
    local.tee 1
    local.get 1
    f32.mul
    f32.add)
  (func $mat4_perspective (type 7) (param i32 f32 f32 f32 f32) (result i32)
    local.get 1
    f32.const 0x1p-1 (;=0.5;)
    f32.mul
    call $tanf
    local.set 1
    local.get 0
    i64.const 0
    i64.store offset=4 align=4
    local.get 0
    i32.const 12
    i32.add
    i64.const 0
    i64.store align=4
    local.get 0
    i64.const 0
    i64.store offset=24 align=4
    local.get 0
    i32.const 32
    i32.add
    i64.const 0
    i64.store align=4
    local.get 0
    i32.const 0
    i32.store offset=60
    local.get 0
    i32.const 0
    i32.store offset=52
    local.get 0
    i64.const 3212836864
    i64.store offset=44 align=4
    local.get 0
    f32.const 0x1p+0 (;=1;)
    local.get 1
    f32.div
    local.tee 1
    f32.store offset=20
    local.get 0
    local.get 3
    local.get 4
    f32.mul
    f32.const 0x1p+0 (;=1;)
    local.get 3
    local.get 4
    f32.sub
    f32.div
    local.tee 3
    f32.mul
    f32.store offset=56
    local.get 0
    local.get 4
    local.get 3
    f32.mul
    f32.store offset=40
    local.get 0
    local.get 1
    local.get 2
    f32.div
    f32.store
    i32.const 0)
  (func $mat4_print (type 8) (param i32))
  (func $mat4_random (type 4) (param i32) (result i32)
    (local i32)
    i32.const 0
    i32.const 0
    i32.load offset=1049692
    local.tee 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.store offset=1049692
    local.get 0
    local.get 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store
    local.get 0
    i32.const 0
    i32.load offset=1049692
    local.tee 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=4
    local.get 0
    local.get 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=8
    local.get 0
    local.get 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=12
    local.get 0
    local.get 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=16
    local.get 0
    local.get 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=20
    local.get 0
    local.get 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=24
    local.get 0
    local.get 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=28
    local.get 0
    local.get 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=32
    local.get 0
    local.get 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=36
    local.get 0
    local.get 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=40
    local.get 0
    local.get 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=44
    local.get 0
    local.get 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=48
    local.get 0
    local.get 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=52
    local.get 0
    local.get 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=56
    i32.const 0
    local.get 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.store offset=1049692
    local.get 0
    local.get 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=60
    i32.const 0)
  (func $mat4_random_range (type 9) (param i32 f32 f32) (result i32)
    (local i32)
    i32.const 0
    i32.const 0
    i32.load offset=1049692
    local.tee 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.store offset=1049692
    local.get 0
    local.get 1
    local.get 2
    local.get 1
    f32.sub
    local.tee 2
    local.get 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store
    local.get 0
    local.get 1
    local.get 2
    i32.const 0
    i32.load offset=1049692
    local.tee 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=4
    local.get 0
    local.get 1
    local.get 2
    local.get 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=8
    local.get 0
    local.get 1
    local.get 2
    local.get 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=12
    local.get 0
    local.get 1
    local.get 2
    local.get 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=16
    local.get 0
    local.get 1
    local.get 2
    local.get 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=20
    local.get 0
    local.get 1
    local.get 2
    local.get 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=24
    local.get 0
    local.get 1
    local.get 2
    local.get 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=28
    local.get 0
    local.get 1
    local.get 2
    local.get 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=32
    local.get 0
    local.get 1
    local.get 2
    local.get 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=36
    local.get 0
    local.get 1
    local.get 2
    local.get 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=40
    local.get 0
    local.get 1
    local.get 2
    local.get 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=44
    local.get 0
    local.get 1
    local.get 2
    local.get 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=48
    local.get 0
    local.get 1
    local.get 2
    local.get 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=52
    local.get 0
    local.get 1
    local.get 2
    local.get 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=56
    i32.const 0
    local.get 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.store offset=1049692
    local.get 0
    local.get 1
    local.get 2
    local.get 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=60
    i32.const 0)
  (func $mat4_rotateX (type 10) (param i32 i32 f32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32 f32 i64 i64 i64 f32)
    local.get 1
    f32.load offset=32
    local.set 3
    local.get 1
    f32.load offset=16
    local.set 4
    local.get 1
    f32.load offset=28
    local.set 5
    local.get 1
    f32.load offset=44
    local.set 6
    local.get 1
    f32.load offset=24
    local.set 7
    local.get 1
    f32.load offset=40
    local.set 8
    local.get 1
    f32.load offset=20
    local.set 9
    local.get 1
    f32.load offset=36
    local.set 10
    local.get 1
    i64.load align=4
    local.set 11
    local.get 1
    i64.load offset=8 align=4
    local.set 12
    local.get 1
    i64.load offset=48 align=4
    local.set 13
    local.get 0
    local.get 1
    i64.load offset=56 align=4
    i64.store offset=56 align=4
    local.get 0
    local.get 13
    i64.store offset=48 align=4
    local.get 0
    local.get 12
    i64.store offset=8 align=4
    local.get 0
    local.get 11
    i64.store align=4
    local.get 2
    call $sinf
    local.set 14
    local.get 0
    local.get 9
    local.get 2
    call $cosf
    local.tee 2
    f32.mul
    local.get 14
    local.get 10
    f32.mul
    f32.add
    f32.store offset=20
    local.get 0
    local.get 2
    local.get 7
    f32.mul
    local.get 14
    local.get 8
    f32.mul
    f32.add
    f32.store offset=24
    local.get 0
    local.get 2
    local.get 5
    f32.mul
    local.get 14
    local.get 6
    f32.mul
    f32.add
    f32.store offset=28
    local.get 0
    local.get 2
    local.get 3
    f32.mul
    local.get 14
    local.get 4
    f32.mul
    f32.sub
    f32.store offset=32
    local.get 0
    local.get 2
    local.get 10
    f32.mul
    local.get 14
    local.get 9
    f32.mul
    f32.sub
    f32.store offset=36
    local.get 0
    local.get 2
    local.get 8
    f32.mul
    local.get 14
    local.get 7
    f32.mul
    f32.sub
    f32.store offset=40
    local.get 0
    local.get 2
    local.get 6
    f32.mul
    local.get 14
    local.get 5
    f32.mul
    f32.sub
    f32.store offset=44
    local.get 0
    local.get 2
    local.get 4
    f32.mul
    local.get 14
    local.get 3
    f32.mul
    f32.add
    f32.store offset=16
    i32.const 0)
  (func $mat4_rotateY (type 10) (param i32 i32 f32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32 f32 i64 i64 i64 f32)
    local.get 1
    f32.load
    local.set 3
    local.get 1
    f32.load offset=32
    local.set 4
    local.get 1
    f32.load offset=12
    local.set 5
    local.get 1
    f32.load offset=44
    local.set 6
    local.get 1
    f32.load offset=8
    local.set 7
    local.get 1
    f32.load offset=40
    local.set 8
    local.get 1
    f32.load offset=4
    local.set 9
    local.get 1
    f32.load offset=36
    local.set 10
    local.get 1
    i64.load offset=16 align=4
    local.set 11
    local.get 1
    i64.load offset=24 align=4
    local.set 12
    local.get 1
    i64.load offset=48 align=4
    local.set 13
    local.get 0
    local.get 1
    i64.load offset=56 align=4
    i64.store offset=56 align=4
    local.get 0
    local.get 13
    i64.store offset=48 align=4
    local.get 0
    local.get 12
    i64.store offset=24 align=4
    local.get 0
    local.get 11
    i64.store offset=16 align=4
    local.get 2
    call $sinf
    local.set 14
    local.get 0
    local.get 9
    local.get 2
    call $cosf
    local.tee 2
    f32.mul
    local.get 14
    local.get 10
    f32.mul
    f32.sub
    f32.store offset=4
    local.get 0
    local.get 2
    local.get 7
    f32.mul
    local.get 14
    local.get 8
    f32.mul
    f32.sub
    f32.store offset=8
    local.get 0
    local.get 2
    local.get 5
    f32.mul
    local.get 14
    local.get 6
    f32.mul
    f32.sub
    f32.store offset=12
    local.get 0
    local.get 14
    local.get 3
    f32.mul
    local.get 2
    local.get 4
    f32.mul
    f32.add
    f32.store offset=32
    local.get 0
    local.get 14
    local.get 9
    f32.mul
    local.get 2
    local.get 10
    f32.mul
    f32.add
    f32.store offset=36
    local.get 0
    local.get 14
    local.get 7
    f32.mul
    local.get 2
    local.get 8
    f32.mul
    f32.add
    f32.store offset=40
    local.get 0
    local.get 14
    local.get 5
    f32.mul
    local.get 2
    local.get 6
    f32.mul
    f32.add
    f32.store offset=44
    local.get 0
    local.get 2
    local.get 3
    f32.mul
    local.get 14
    local.get 4
    f32.mul
    f32.sub
    f32.store
    i32.const 0)
  (func $mat4_rotateZ (type 10) (param i32 i32 f32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32 f32 i64 i64 i64 f32)
    local.get 1
    f32.load offset=16
    local.set 3
    local.get 1
    f32.load
    local.set 4
    local.get 1
    f32.load offset=12
    local.set 5
    local.get 1
    f32.load offset=28
    local.set 6
    local.get 1
    f32.load offset=8
    local.set 7
    local.get 1
    f32.load offset=24
    local.set 8
    local.get 1
    f32.load offset=4
    local.set 9
    local.get 1
    f32.load offset=20
    local.set 10
    local.get 1
    i64.load offset=32 align=4
    local.set 11
    local.get 1
    i64.load offset=40 align=4
    local.set 12
    local.get 1
    i64.load offset=48 align=4
    local.set 13
    local.get 0
    local.get 1
    i64.load offset=56 align=4
    i64.store offset=56 align=4
    local.get 0
    local.get 13
    i64.store offset=48 align=4
    local.get 0
    local.get 12
    i64.store offset=40 align=4
    local.get 0
    local.get 11
    i64.store offset=32 align=4
    local.get 2
    call $sinf
    local.set 14
    local.get 0
    local.get 9
    local.get 2
    call $cosf
    local.tee 2
    f32.mul
    local.get 14
    local.get 10
    f32.mul
    f32.add
    f32.store offset=4
    local.get 0
    local.get 2
    local.get 7
    f32.mul
    local.get 14
    local.get 8
    f32.mul
    f32.add
    f32.store offset=8
    local.get 0
    local.get 2
    local.get 5
    f32.mul
    local.get 14
    local.get 6
    f32.mul
    f32.add
    f32.store offset=12
    local.get 0
    local.get 2
    local.get 3
    f32.mul
    local.get 14
    local.get 4
    f32.mul
    f32.sub
    f32.store offset=16
    local.get 0
    local.get 2
    local.get 10
    f32.mul
    local.get 14
    local.get 9
    f32.mul
    f32.sub
    f32.store offset=20
    local.get 0
    local.get 2
    local.get 8
    f32.mul
    local.get 14
    local.get 7
    f32.mul
    f32.sub
    f32.store offset=24
    local.get 0
    local.get 2
    local.get 6
    f32.mul
    local.get 14
    local.get 5
    f32.mul
    f32.sub
    f32.store offset=28
    local.get 0
    local.get 2
    local.get 4
    f32.mul
    local.get 14
    local.get 3
    f32.mul
    f32.add
    f32.store
    i32.const 0)
  (func $mat4_round (type 0) (param i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=8
    local.get 0
    local.get 1
    f32.load offset=12
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=12
    local.get 0
    local.get 1
    f32.load offset=16
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=16
    local.get 0
    local.get 1
    f32.load offset=20
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=20
    local.get 0
    local.get 1
    f32.load offset=24
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=24
    local.get 0
    local.get 1
    f32.load offset=28
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=28
    local.get 0
    local.get 1
    f32.load offset=32
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=32
    local.get 0
    local.get 1
    f32.load offset=36
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=36
    local.get 0
    local.get 1
    f32.load offset=40
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=40
    local.get 0
    local.get 1
    f32.load offset=44
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=44
    local.get 0
    local.get 1
    f32.load offset=48
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=48
    local.get 0
    local.get 1
    f32.load offset=52
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=52
    local.get 0
    local.get 1
    f32.load offset=56
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=56
    local.get 0
    local.get 1
    f32.load offset=60
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=60
    i32.const 0)
  (func $mat4_scl (type 10) (param i32 i32 f32) (result i32)
    local.get 0
    local.get 2
    local.get 1
    f32.load
    f32.mul
    f32.store
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=4
    f32.mul
    f32.store offset=4
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=8
    f32.mul
    f32.store offset=8
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=12
    f32.mul
    f32.store offset=12
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=16
    f32.mul
    f32.store offset=16
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=20
    f32.mul
    f32.store offset=20
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=24
    f32.mul
    f32.store offset=24
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=28
    f32.mul
    f32.store offset=28
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=32
    f32.mul
    f32.store offset=32
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=36
    f32.mul
    f32.store offset=36
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=40
    f32.mul
    f32.store offset=40
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=44
    f32.mul
    f32.store offset=44
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=48
    f32.mul
    f32.store offset=48
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=52
    f32.mul
    f32.store offset=52
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=56
    f32.mul
    f32.store offset=56
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=60
    f32.mul
    f32.store offset=60
    i32.const 0)
  (func $mat4_sub (type 1) (param i32 i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    local.get 2
    f32.load
    f32.sub
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    local.get 2
    f32.load offset=4
    f32.sub
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    local.get 2
    f32.load offset=8
    f32.sub
    f32.store offset=8
    local.get 0
    local.get 1
    f32.load offset=12
    local.get 2
    f32.load offset=12
    f32.sub
    f32.store offset=12
    local.get 0
    local.get 1
    f32.load offset=16
    local.get 2
    f32.load offset=16
    f32.sub
    f32.store offset=16
    local.get 0
    local.get 1
    f32.load offset=20
    local.get 2
    f32.load offset=20
    f32.sub
    f32.store offset=20
    local.get 0
    local.get 1
    f32.load offset=24
    local.get 2
    f32.load offset=24
    f32.sub
    f32.store offset=24
    local.get 0
    local.get 1
    f32.load offset=28
    local.get 2
    f32.load offset=28
    f32.sub
    f32.store offset=28
    local.get 0
    local.get 1
    f32.load offset=32
    local.get 2
    f32.load offset=32
    f32.sub
    f32.store offset=32
    local.get 0
    local.get 1
    f32.load offset=36
    local.get 2
    f32.load offset=36
    f32.sub
    f32.store offset=36
    local.get 0
    local.get 1
    f32.load offset=40
    local.get 2
    f32.load offset=40
    f32.sub
    f32.store offset=40
    local.get 0
    local.get 1
    f32.load offset=44
    local.get 2
    f32.load offset=44
    f32.sub
    f32.store offset=44
    local.get 0
    local.get 1
    f32.load offset=48
    local.get 2
    f32.load offset=48
    f32.sub
    f32.store offset=48
    local.get 0
    local.get 1
    f32.load offset=52
    local.get 2
    f32.load offset=52
    f32.sub
    f32.store offset=52
    local.get 0
    local.get 1
    f32.load offset=56
    local.get 2
    f32.load offset=56
    f32.sub
    f32.store offset=56
    local.get 0
    local.get 1
    f32.load offset=60
    local.get 2
    f32.load offset=60
    f32.sub
    f32.store offset=60
    i32.const 0)
  (func $mat4_trace (type 3) (param i32) (result f32)
    local.get 0
    f32.load
    local.get 0
    f32.load offset=20
    f32.add
    local.get 0
    f32.load offset=40
    f32.add
    local.get 0
    f32.load offset=60
    f32.add)
  (func $mat4_translate (type 1) (param i32 i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    f32.store offset=8
    local.get 0
    local.get 1
    f32.load offset=12
    f32.store offset=12
    local.get 0
    local.get 1
    f32.load offset=16
    f32.store offset=16
    local.get 0
    local.get 1
    f32.load offset=20
    f32.store offset=20
    local.get 0
    local.get 1
    f32.load offset=24
    f32.store offset=24
    local.get 0
    local.get 1
    f32.load offset=28
    f32.store offset=28
    local.get 0
    local.get 1
    f32.load offset=32
    f32.store offset=32
    local.get 0
    local.get 1
    f32.load offset=36
    f32.store offset=36
    local.get 0
    local.get 1
    f32.load offset=40
    f32.store offset=40
    local.get 0
    local.get 1
    f32.load offset=44
    f32.store offset=44
    local.get 0
    local.get 1
    f32.load offset=48
    local.get 2
    f32.load
    f32.add
    f32.store offset=48
    local.get 0
    local.get 1
    f32.load offset=52
    local.get 2
    f32.load offset=4
    f32.add
    f32.store offset=52
    local.get 0
    local.get 1
    f32.load offset=56
    local.get 2
    f32.load offset=8
    f32.add
    f32.store offset=56
    local.get 0
    local.get 1
    f32.load offset=60
    f32.store offset=60
    i32.const 0)
  (func $mat4_transpose (type 0) (param i32 i32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32)
    local.get 1
    f32.load
    local.set 2
    local.get 1
    f32.load offset=16
    local.set 3
    local.get 1
    f32.load offset=32
    local.set 4
    local.get 1
    f32.load offset=48
    local.set 5
    local.get 1
    f32.load offset=4
    local.set 6
    local.get 1
    f32.load offset=20
    local.set 7
    local.get 1
    f32.load offset=36
    local.set 8
    local.get 1
    f32.load offset=52
    local.set 9
    local.get 1
    f32.load offset=8
    local.set 10
    local.get 1
    f32.load offset=24
    local.set 11
    local.get 1
    f32.load offset=40
    local.set 12
    local.get 1
    f32.load offset=56
    local.set 13
    local.get 1
    f32.load offset=12
    local.set 14
    local.get 1
    f32.load offset=28
    local.set 15
    local.get 1
    f32.load offset=44
    local.set 16
    local.get 0
    local.get 1
    f32.load offset=60
    f32.store offset=60
    local.get 0
    local.get 16
    f32.store offset=56
    local.get 0
    local.get 15
    f32.store offset=52
    local.get 0
    local.get 14
    f32.store offset=48
    local.get 0
    local.get 13
    f32.store offset=44
    local.get 0
    local.get 12
    f32.store offset=40
    local.get 0
    local.get 11
    f32.store offset=36
    local.get 0
    local.get 10
    f32.store offset=32
    local.get 0
    local.get 9
    f32.store offset=28
    local.get 0
    local.get 8
    f32.store offset=24
    local.get 0
    local.get 7
    f32.store offset=20
    local.get 0
    local.get 6
    f32.store offset=16
    local.get 0
    local.get 5
    f32.store offset=12
    local.get 0
    local.get 4
    f32.store offset=8
    local.get 0
    local.get 3
    f32.store offset=4
    local.get 0
    local.get 2
    f32.store
    i32.const 0)
  (func $quat_abs (type 0) (param i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    f32.abs
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    f32.abs
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    f32.abs
    f32.store offset=8
    local.get 0
    local.get 1
    f32.load offset=12
    f32.abs
    f32.store offset=12
    i32.const 0)
  (func $quat_add (type 1) (param i32 i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    local.get 2
    f32.load
    f32.add
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    local.get 2
    f32.load offset=4
    f32.add
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    local.get 2
    f32.load offset=8
    f32.add
    f32.store offset=8
    local.get 0
    local.get 1
    f32.load offset=12
    local.get 2
    f32.load offset=12
    f32.add
    f32.store offset=12
    i32.const 0)
  (func $quat_copy (type 0) (param i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    f32.store offset=8
    local.get 0
    local.get 1
    f32.load offset=12
    f32.store offset=12
    i32.const 0)
  (func $quat_dist (type 11) (param i32 i32) (result f32)
    (local f32)
    local.get 0
    f32.load
    local.get 1
    f32.load
    f32.sub
    local.tee 2
    local.get 2
    f32.mul
    local.get 0
    f32.load offset=4
    local.get 1
    f32.load offset=4
    f32.sub
    local.tee 2
    local.get 2
    f32.mul
    f32.add
    local.get 0
    f32.load offset=8
    local.get 1
    f32.load offset=8
    f32.sub
    local.tee 2
    local.get 2
    f32.mul
    f32.add
    local.get 0
    f32.load offset=12
    local.get 1
    f32.load offset=12
    f32.sub
    local.tee 2
    local.get 2
    f32.mul
    f32.add
    f32.sqrt)
  (func $quat_distsq (type 11) (param i32 i32) (result f32)
    (local f32)
    local.get 0
    f32.load
    local.get 1
    f32.load
    f32.sub
    local.tee 2
    local.get 2
    f32.mul
    local.get 0
    f32.load offset=4
    local.get 1
    f32.load offset=4
    f32.sub
    local.tee 2
    local.get 2
    f32.mul
    f32.add
    local.get 0
    f32.load offset=8
    local.get 1
    f32.load offset=8
    f32.sub
    local.tee 2
    local.get 2
    f32.mul
    f32.add
    local.get 0
    f32.load offset=12
    local.get 1
    f32.load offset=12
    f32.sub
    local.tee 2
    local.get 2
    f32.mul
    f32.add)
  (func $quat_fromAxisAngle (type 10) (param i32 i32 f32) (result i32)
    (local f32 f32)
    local.get 0
    local.get 1
    f32.load
    local.get 2
    f32.const 0x1p-1 (;=0.5;)
    f32.mul
    local.tee 3
    call $sinf
    local.tee 2
    f32.mul
    f32.store
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=4
    f32.mul
    f32.store offset=4
    local.get 1
    f32.load offset=8
    local.set 4
    local.get 0
    local.get 3
    call $cosf
    f32.store offset=12
    local.get 0
    local.get 2
    local.get 4
    f32.mul
    f32.store offset=8
    i32.const 0)
  (func $quat_init (type 7) (param i32 f32 f32 f32 f32) (result i32)
    local.get 0
    local.get 4
    f32.store offset=12
    local.get 0
    local.get 3
    f32.store offset=8
    local.get 0
    local.get 2
    f32.store offset=4
    local.get 0
    local.get 1
    f32.store
    i32.const 0)
  (func $quat_invert (type 0) (param i32 i32) (result i32)
    (local f32 f32)
    block  ;; label = @1
      block  ;; label = @2
        local.get 1
        f32.load
        local.tee 2
        local.get 2
        f32.mul
        local.get 1
        f32.load offset=4
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.get 1
        f32.load offset=8
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.get 1
        f32.load offset=12
        local.tee 3
        local.get 3
        f32.mul
        f32.add
        local.tee 3
        f32.const 0x0p+0 (;=0;)
        f32.eq
        br_if 0 (;@2;)
        local.get 0
        f32.const 0x1p+0 (;=1;)
        local.get 3
        f32.div
        local.tee 3
        local.get 2
        f32.neg
        f32.mul
        f32.store
        local.get 0
        local.get 3
        local.get 1
        f32.load offset=4
        f32.neg
        f32.mul
        f32.store offset=4
        local.get 0
        local.get 3
        local.get 1
        f32.load offset=8
        f32.neg
        f32.mul
        f32.store offset=8
        local.get 3
        local.get 1
        f32.load offset=12
        f32.mul
        local.set 2
        br 1 (;@1;)
      end
      local.get 0
      i32.const 0
      i32.store offset=8
      local.get 0
      i64.const 0
      i64.store align=4
      f32.const 0x1p+0 (;=1;)
      local.set 2
    end
    local.get 0
    local.get 2
    f32.store offset=12
    i32.const 0)
  (func $quat_isEqual (type 0) (param i32 i32) (result i32)
    (local i32)
    i32.const 0
    local.set 2
    block  ;; label = @1
      local.get 0
      f32.load
      local.get 1
      f32.load
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=4
      local.get 1
      f32.load offset=4
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=8
      local.get 1
      f32.load offset=8
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=12
      local.get 1
      f32.load offset=12
      f32.ne
      br_if 0 (;@1;)
      i32.const 1
      local.set 2
    end
    local.get 2)
  (func $quat_isNormalized (type 4) (param i32) (result i32)
    (local f32)
    local.get 0
    f32.load
    local.tee 1
    local.get 1
    f32.mul
    local.get 0
    f32.load offset=4
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=8
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=12
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    f32.const 0x1p+0 (;=1;)
    f32.eq)
  (func $quat_isZero (type 4) (param i32) (result i32)
    (local i32)
    i32.const 0
    local.set 1
    block  ;; label = @1
      local.get 0
      f32.load
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=4
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=8
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=12
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      i32.const 1
      local.set 1
    end
    local.get 1)
  (func $quat_mul (type 1) (param i32 i32 i32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32 f32)
    local.get 0
    local.get 1
    f32.load offset=12
    local.tee 3
    local.get 2
    f32.load offset=12
    local.tee 4
    f32.mul
    local.get 2
    f32.load
    local.tee 5
    local.get 1
    f32.load
    local.tee 6
    f32.mul
    f32.sub
    local.get 1
    f32.load offset=4
    local.tee 7
    local.get 2
    f32.load offset=4
    local.tee 8
    f32.mul
    f32.sub
    local.get 2
    f32.load offset=8
    local.tee 9
    local.get 1
    f32.load offset=8
    local.tee 10
    f32.mul
    f32.sub
    f32.store offset=12
    local.get 0
    local.get 4
    local.get 10
    f32.mul
    local.get 3
    local.get 9
    f32.mul
    local.get 6
    local.get 8
    f32.mul
    f32.add
    local.get 5
    local.get 7
    f32.mul
    f32.sub
    f32.add
    f32.store offset=8
    local.get 0
    local.get 5
    local.get 10
    f32.mul
    local.get 4
    local.get 7
    f32.mul
    local.get 3
    local.get 8
    f32.mul
    local.get 6
    local.get 9
    f32.mul
    f32.sub
    f32.add
    f32.add
    f32.store offset=4
    local.get 0
    local.get 3
    local.get 5
    f32.mul
    local.get 6
    local.get 4
    f32.mul
    f32.add
    local.get 7
    local.get 9
    f32.mul
    f32.add
    local.get 10
    local.get 8
    f32.mul
    f32.sub
    f32.store
    i32.const 0)
  (func $quat_neg (type 0) (param i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    f32.neg
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    f32.neg
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    f32.neg
    f32.store offset=8
    local.get 0
    local.get 1
    f32.load offset=12
    f32.neg
    f32.store offset=12
    i32.const 0)
  (func $quat_norm (type 3) (param i32) (result f32)
    (local f32)
    local.get 0
    f32.load
    local.tee 1
    local.get 1
    f32.mul
    local.get 0
    f32.load offset=4
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=8
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=12
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    f32.sqrt)
  (func $quat_normalize (type 0) (param i32 i32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32 f32 f32)
    f32.const 0x0p+0 (;=0;)
    local.set 2
    f32.const 0x0p+0 (;=0;)
    local.set 3
    f32.const 0x0p+0 (;=0;)
    local.set 4
    f32.const 0x0p+0 (;=0;)
    local.set 5
    block  ;; label = @1
      local.get 1
      f32.load
      local.tee 6
      local.get 6
      f32.mul
      local.get 1
      f32.load offset=4
      local.tee 7
      local.get 7
      f32.mul
      f32.add
      local.get 1
      f32.load offset=8
      local.tee 8
      local.get 8
      f32.mul
      f32.add
      local.get 1
      f32.load offset=12
      local.tee 9
      local.get 9
      f32.mul
      f32.add
      local.tee 10
      f32.const 0x0p+0 (;=0;)
      f32.eq
      br_if 0 (;@1;)
      local.get 9
      f32.const 0x1p+0 (;=1;)
      local.get 10
      f32.sqrt
      f32.div
      local.tee 2
      f32.mul
      local.set 5
      local.get 8
      local.get 2
      f32.mul
      local.set 4
      local.get 7
      local.get 2
      f32.mul
      local.set 3
      local.get 6
      local.get 2
      f32.mul
      local.set 2
    end
    local.get 0
    local.get 5
    f32.store offset=12
    local.get 0
    local.get 4
    f32.store offset=8
    local.get 0
    local.get 3
    f32.store offset=4
    local.get 0
    local.get 2
    f32.store
    i32.const 0)
  (func $quat_normscl (type 10) (param i32 i32 f32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32 f32 f32)
    f32.const 0x0p+0 (;=0;)
    local.set 3
    f32.const 0x0p+0 (;=0;)
    local.set 4
    f32.const 0x0p+0 (;=0;)
    local.set 5
    f32.const 0x0p+0 (;=0;)
    local.set 6
    block  ;; label = @1
      local.get 1
      f32.load
      local.tee 7
      local.get 7
      f32.mul
      local.get 1
      f32.load offset=4
      local.tee 8
      local.get 8
      f32.mul
      f32.add
      local.get 1
      f32.load offset=8
      local.tee 9
      local.get 9
      f32.mul
      f32.add
      local.get 1
      f32.load offset=12
      local.tee 10
      local.get 10
      f32.mul
      f32.add
      local.tee 11
      f32.const 0x0p+0 (;=0;)
      f32.eq
      br_if 0 (;@1;)
      local.get 10
      f32.const 0x1p+0 (;=1;)
      local.get 11
      f32.sqrt
      f32.div
      local.tee 3
      f32.mul
      local.set 6
      local.get 9
      local.get 3
      f32.mul
      local.set 5
      local.get 8
      local.get 3
      f32.mul
      local.set 4
      local.get 7
      local.get 3
      f32.mul
      local.set 3
    end
    local.get 0
    local.get 2
    local.get 6
    f32.mul
    f32.store offset=12
    local.get 0
    local.get 2
    local.get 5
    f32.mul
    f32.store offset=8
    local.get 0
    local.get 2
    local.get 4
    f32.mul
    f32.store offset=4
    local.get 0
    local.get 2
    local.get 3
    f32.mul
    f32.store
    i32.const 0)
  (func $quat_normsq (type 3) (param i32) (result f32)
    (local f32)
    local.get 0
    f32.load
    local.tee 1
    local.get 1
    f32.mul
    local.get 0
    f32.load offset=4
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=8
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=12
    local.tee 1
    local.get 1
    f32.mul
    f32.add)
  (func $quat_random (type 4) (param i32) (result i32)
    (local i32)
    i32.const 0
    i32.const 0
    i32.load offset=1049692
    local.tee 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.store offset=1049692
    local.get 0
    local.get 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store
    local.get 0
    i32.const 0
    i32.load offset=1049692
    local.tee 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=4
    local.get 0
    local.get 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=8
    i32.const 0
    local.get 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.store offset=1049692
    local.get 0
    local.get 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=12
    i32.const 0)
  (func $quat_random_range (type 9) (param i32 f32 f32) (result i32)
    (local i32)
    i32.const 0
    i32.const 0
    i32.load offset=1049692
    local.tee 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.store offset=1049692
    local.get 0
    local.get 1
    local.get 2
    local.get 1
    f32.sub
    local.tee 2
    local.get 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store
    local.get 0
    local.get 1
    local.get 2
    i32.const 0
    i32.load offset=1049692
    local.tee 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=4
    local.get 0
    local.get 1
    local.get 2
    local.get 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=8
    i32.const 0
    local.get 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.store offset=1049692
    local.get 0
    local.get 1
    local.get 2
    local.get 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=12
    i32.const 0)
  (func $quat_round (type 0) (param i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=8
    local.get 0
    local.get 1
    f32.load offset=12
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=12
    i32.const 0)
  (func $quat_scl (type 10) (param i32 i32 f32) (result i32)
    local.get 0
    local.get 2
    local.get 1
    f32.load
    f32.mul
    f32.store
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=4
    f32.mul
    f32.store offset=4
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=8
    f32.mul
    f32.store offset=8
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=12
    f32.mul
    f32.store offset=12
    i32.const 0)
  (func $quat_slerp (type 12) (param i32 i32 i32 f32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32)
    block  ;; label = @1
      local.get 1
      f32.load
      local.tee 4
      local.get 2
      f32.load
      local.tee 5
      f32.mul
      local.get 1
      f32.load offset=4
      local.tee 6
      local.get 2
      f32.load offset=4
      local.tee 7
      f32.mul
      f32.add
      local.get 1
      f32.load offset=8
      local.tee 8
      local.get 2
      f32.load offset=8
      local.tee 9
      f32.mul
      f32.add
      local.get 1
      f32.load offset=12
      local.tee 10
      local.get 2
      f32.load offset=12
      local.tee 11
      f32.mul
      f32.add
      local.tee 12
      f32.const 0x0p+0 (;=0;)
      f32.lt
      i32.eqz
      br_if 0 (;@1;)
      local.get 12
      f32.neg
      local.set 12
      local.get 11
      f32.neg
      local.set 11
      local.get 9
      f32.neg
      local.set 9
      local.get 7
      f32.neg
      local.set 7
      local.get 5
      f32.neg
      local.set 5
    end
    block  ;; label = @1
      block  ;; label = @2
        local.get 12
        f32.const 0x1.ffbe76p-1 (;=0.9995;)
        f32.gt
        br_if 0 (;@2;)
        local.get 11
        local.get 3
        local.get 12
        call $acosf
        local.tee 13
        f32.mul
        local.tee 14
        call $sinf
        local.tee 15
        local.get 13
        call $sinf
        local.tee 13
        f32.div
        local.tee 3
        f32.mul
        local.get 10
        local.get 14
        call $cosf
        local.get 12
        local.get 15
        f32.mul
        local.get 13
        f32.div
        f32.sub
        local.tee 11
        f32.mul
        f32.add
        local.set 12
        local.get 9
        local.get 3
        f32.mul
        local.get 8
        local.get 11
        f32.mul
        f32.add
        local.set 13
        local.get 7
        local.get 3
        f32.mul
        local.get 6
        local.get 11
        f32.mul
        f32.add
        local.set 14
        local.get 5
        local.get 3
        f32.mul
        local.get 4
        local.get 11
        f32.mul
        f32.add
        local.set 15
        br 1 (;@1;)
      end
      f32.const 0x0p+0 (;=0;)
      local.set 15
      f32.const 0x0p+0 (;=0;)
      local.set 14
      f32.const 0x0p+0 (;=0;)
      local.set 13
      f32.const 0x0p+0 (;=0;)
      local.set 12
      local.get 10
      local.get 3
      local.get 11
      local.get 10
      f32.sub
      f32.mul
      f32.add
      local.tee 11
      local.get 11
      f32.mul
      local.get 8
      local.get 3
      local.get 9
      local.get 8
      f32.sub
      f32.mul
      f32.add
      local.tee 9
      local.get 9
      f32.mul
      local.get 6
      local.get 3
      local.get 7
      local.get 6
      f32.sub
      f32.mul
      f32.add
      local.tee 7
      local.get 7
      f32.mul
      local.get 4
      local.get 3
      local.get 5
      local.get 4
      f32.sub
      f32.mul
      f32.add
      local.tee 3
      local.get 3
      f32.mul
      f32.add
      f32.add
      f32.add
      local.tee 5
      f32.const 0x0p+0 (;=0;)
      f32.eq
      br_if 0 (;@1;)
      local.get 11
      f32.const 0x1p+0 (;=1;)
      local.get 5
      f32.sqrt
      f32.div
      local.tee 5
      f32.mul
      local.set 12
      local.get 9
      local.get 5
      f32.mul
      local.set 13
      local.get 7
      local.get 5
      f32.mul
      local.set 14
      local.get 3
      local.get 5
      f32.mul
      local.set 15
    end
    local.get 0
    local.get 12
    f32.store offset=12
    local.get 0
    local.get 13
    f32.store offset=8
    local.get 0
    local.get 14
    f32.store offset=4
    local.get 0
    local.get 15
    f32.store
    i32.const 0)
  (func $quat_sub (type 1) (param i32 i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    local.get 2
    f32.load
    f32.sub
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    local.get 2
    f32.load offset=4
    f32.sub
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    local.get 2
    f32.load offset=8
    f32.sub
    f32.store offset=8
    local.get 0
    local.get 1
    f32.load offset=12
    local.get 2
    f32.load offset=12
    f32.sub
    f32.store offset=12
    i32.const 0)
  (func $quat_toRotation (type 1) (param i32 i32 i32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32)
    local.get 0
    local.get 2
    f32.load
    local.tee 3
    local.get 1
    f32.load offset=12
    local.get 1
    f32.load offset=4
    local.tee 4
    local.get 2
    f32.load offset=8
    local.tee 5
    f32.mul
    local.get 1
    f32.load offset=8
    local.tee 6
    local.get 2
    f32.load offset=4
    local.tee 7
    f32.mul
    f32.sub
    local.tee 8
    local.get 8
    f32.add
    local.tee 8
    f32.mul
    f32.add
    local.get 4
    local.get 7
    local.get 1
    f32.load
    local.tee 9
    f32.mul
    local.get 4
    local.get 3
    f32.mul
    f32.sub
    local.tee 7
    local.get 7
    f32.add
    local.tee 7
    f32.mul
    f32.add
    local.get 6
    local.get 6
    local.get 3
    f32.mul
    local.get 5
    local.get 9
    f32.mul
    f32.sub
    local.tee 3
    local.get 3
    f32.add
    local.tee 3
    f32.mul
    f32.sub
    f32.store
    local.get 0
    local.get 2
    f32.load offset=4
    local.get 3
    local.get 1
    f32.load offset=12
    f32.mul
    f32.add
    local.get 8
    local.get 1
    f32.load offset=8
    f32.mul
    f32.add
    local.get 7
    local.get 1
    f32.load
    f32.mul
    f32.sub
    f32.store offset=4
    local.get 0
    local.get 2
    f32.load offset=8
    local.get 7
    local.get 1
    f32.load offset=12
    f32.mul
    f32.add
    local.get 3
    local.get 1
    f32.load
    f32.mul
    f32.add
    local.get 8
    local.get 1
    f32.load offset=4
    f32.mul
    f32.sub
    f32.store offset=8
    i32.const 0)
  (func $transform_compose_local_many (type 13) (param i32 i32 i32 i32 i32) (result i32)
    (local i32 i32 i32 i32 i32 i32 i32 i32 i32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32)
    block  ;; label = @1
      block  ;; label = @2
        block  ;; label = @3
          block  ;; label = @4
            block  ;; label = @5
              block  ;; label = @6
                local.get 4
                i32.eqz
                br_if 0 (;@6;)
                local.get 4
                i32.const 3
                i32.mul
                local.set 5
                local.get 4
                i32.const 1073741823
                i32.and
                local.set 6
                i32.const 2
                local.set 7
                local.get 4
                i32.const 268435455
                i32.and
                i32.const 2
                i32.shl
                local.set 8
                local.get 4
                local.set 9
                i32.const 0
                local.set 10
                i32.const 0
                local.set 11
                i32.const 0
                local.set 12
                loop  ;; label = @7
                  local.get 7
                  i32.const -2
                  i32.add
                  local.tee 13
                  local.get 5
                  i32.ge_u
                  br_if 3 (;@4;)
                  local.get 7
                  i32.const -1
                  i32.add
                  local.tee 13
                  local.get 5
                  i32.ge_u
                  br_if 4 (;@3;)
                  local.get 7
                  local.get 5
                  i32.ge_u
                  br_if 5 (;@2;)
                  local.get 6
                  i32.eqz
                  br_if 6 (;@1;)
                  local.get 8
                  local.get 10
                  i32.eq
                  br_if 2 (;@5;)
                  local.get 1
                  local.get 12
                  i32.add
                  local.tee 13
                  f32.load
                  local.set 14
                  local.get 13
                  i32.const 4
                  i32.add
                  f32.load
                  local.set 15
                  local.get 13
                  i32.const 8
                  i32.add
                  f32.load
                  local.set 16
                  local.get 3
                  local.get 12
                  i32.add
                  local.tee 13
                  f32.load
                  local.set 17
                  local.get 13
                  i32.const 4
                  i32.add
                  f32.load
                  local.set 18
                  local.get 13
                  i32.const 8
                  i32.add
                  f32.load
                  local.set 19
                  local.get 2
                  local.get 11
                  i32.add
                  local.tee 13
                  i32.const 4
                  i32.add
                  f32.load
                  local.set 20
                  local.get 13
                  i32.const 8
                  i32.add
                  f32.load
                  local.set 21
                  local.get 13
                  f32.load
                  local.set 22
                  local.get 13
                  i32.const 12
                  i32.add
                  f32.load
                  local.set 23
                  local.get 0
                  i32.const 60
                  i32.add
                  i32.const 1065353216
                  i32.store
                  local.get 0
                  i32.const 56
                  i32.add
                  local.get 16
                  f32.store
                  local.get 0
                  i32.const 52
                  i32.add
                  local.get 15
                  f32.store
                  local.get 0
                  i32.const 48
                  i32.add
                  local.get 14
                  f32.store
                  local.get 0
                  i32.const 44
                  i32.add
                  i32.const 0
                  i32.store
                  local.get 0
                  i32.const 28
                  i32.add
                  i32.const 0
                  i32.store
                  local.get 0
                  i32.const 12
                  i32.add
                  i32.const 0
                  i32.store
                  local.get 0
                  i32.const 36
                  i32.add
                  local.get 19
                  local.get 20
                  local.get 21
                  f32.mul
                  local.tee 14
                  local.get 22
                  local.get 23
                  f32.mul
                  local.tee 15
                  f32.sub
                  local.tee 16
                  local.get 16
                  f32.add
                  f32.mul
                  f32.store
                  local.get 0
                  i32.const 32
                  i32.add
                  local.get 19
                  local.get 22
                  local.get 21
                  f32.mul
                  local.tee 16
                  local.get 20
                  local.get 23
                  f32.mul
                  local.tee 24
                  f32.add
                  local.tee 25
                  local.get 25
                  f32.add
                  f32.mul
                  f32.store
                  local.get 0
                  i32.const 24
                  i32.add
                  local.get 18
                  local.get 14
                  local.get 15
                  f32.add
                  local.tee 14
                  local.get 14
                  f32.add
                  f32.mul
                  f32.store
                  local.get 0
                  i32.const 16
                  i32.add
                  local.get 18
                  local.get 22
                  local.get 20
                  f32.mul
                  local.tee 14
                  local.get 21
                  local.get 23
                  f32.mul
                  local.tee 23
                  f32.sub
                  local.tee 15
                  local.get 15
                  f32.add
                  f32.mul
                  f32.store
                  local.get 0
                  i32.const 8
                  i32.add
                  local.get 17
                  local.get 16
                  local.get 24
                  f32.sub
                  local.tee 15
                  local.get 15
                  f32.add
                  f32.mul
                  f32.store
                  local.get 0
                  i32.const 4
                  i32.add
                  local.get 17
                  local.get 14
                  local.get 23
                  f32.add
                  local.tee 23
                  local.get 23
                  f32.add
                  f32.mul
                  f32.store
                  local.get 0
                  i32.const 40
                  i32.add
                  local.get 19
                  f32.const 0x1p+0 (;=1;)
                  local.get 22
                  local.get 22
                  f32.mul
                  local.tee 22
                  local.get 20
                  local.get 20
                  f32.mul
                  local.tee 20
                  f32.add
                  local.tee 23
                  local.get 23
                  f32.add
                  f32.sub
                  f32.mul
                  f32.store
                  local.get 0
                  i32.const 20
                  i32.add
                  local.get 18
                  f32.const 0x1p+0 (;=1;)
                  local.get 22
                  local.get 21
                  local.get 21
                  f32.mul
                  local.tee 21
                  f32.add
                  local.tee 22
                  local.get 22
                  f32.add
                  f32.sub
                  f32.mul
                  f32.store
                  local.get 0
                  local.get 17
                  f32.const 0x1p+0 (;=1;)
                  local.get 20
                  local.get 21
                  f32.add
                  local.tee 20
                  local.get 20
                  f32.add
                  f32.sub
                  f32.mul
                  f32.store
                  local.get 6
                  i32.const -1
                  i32.add
                  local.set 6
                  local.get 0
                  i32.const 64
                  i32.add
                  local.set 0
                  local.get 10
                  i32.const 4
                  i32.add
                  local.set 10
                  local.get 11
                  i32.const 16
                  i32.add
                  local.set 11
                  local.get 12
                  i32.const 12
                  i32.add
                  local.set 12
                  local.get 7
                  i32.const 3
                  i32.add
                  local.set 7
                  local.get 9
                  i32.const -1
                  i32.add
                  local.tee 9
                  br_if 0 (;@7;)
                end
              end
              i32.const 0
              return
            end
            local.get 11
            local.get 4
            i32.const 4
            i32.shl
            i32.const 1048712
            call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
            unreachable
          end
          local.get 13
          local.get 5
          i32.const 1048648
          call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
          unreachable
        end
        local.get 13
        local.get 5
        i32.const 1048664
        call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
        unreachable
      end
      local.get 7
      local.get 5
      i32.const 1048680
      call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
      unreachable
    end
    local.get 10
    local.get 4
    i32.const 2
    i32.shl
    i32.const 1048696
    call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
    unreachable)
  (func $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E (type 14) (param i32 i32 i32)
    (local i32 i64)
    global.get $__stack_pointer
    i32.const 32
    i32.sub
    local.tee 3
    global.set $__stack_pointer
    local.get 3
    local.get 1
    i32.store offset=12
    local.get 3
    local.get 0
    i32.store offset=8
    local.get 3
    i32.const 1
    i64.extend_i32_u
    i64.const 32
    i64.shl
    local.tee 4
    local.get 3
    i32.const 8
    i32.add
    i64.extend_i32_u
    i64.or
    i64.store offset=24
    local.get 3
    local.get 4
    local.get 3
    i32.const 12
    i32.add
    i64.extend_i32_u
    i64.or
    i64.store offset=16
    i32.const 1048576
    local.get 3
    i32.const 16
    i32.add
    local.get 2
    call $_ZN4core9panicking9panic_fmt17ha9276d4d9f74c64eE
    unreachable)
  (func $transform_pack_model_normal_mat4_from_ptrs (type 1) (param i32 i32 i32) (result i32)
    (local i32 i32 i32 i32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32)
    block  ;; label = @1
      block  ;; label = @2
        local.get 2
        i32.eqz
        br_if 0 (;@2;)
        local.get 2
        i32.const 134217727
        i32.and
        local.set 3
        i32.const 0
        local.set 4
        local.get 2
        local.set 5
        loop  ;; label = @3
          local.get 3
          i32.eqz
          br_if 2 (;@1;)
          local.get 0
          local.get 1
          i32.load
          local.tee 6
          f32.load
          f32.store
          local.get 0
          i32.const 4
          i32.add
          local.get 6
          f32.load offset=4
          f32.store
          local.get 0
          i32.const 8
          i32.add
          local.get 6
          f32.load offset=8
          f32.store
          local.get 0
          i32.const 12
          i32.add
          local.get 6
          f32.load offset=12
          f32.store
          local.get 0
          i32.const 16
          i32.add
          local.get 6
          f32.load offset=16
          f32.store
          local.get 0
          i32.const 20
          i32.add
          local.get 6
          f32.load offset=20
          f32.store
          local.get 0
          i32.const 24
          i32.add
          local.get 6
          f32.load offset=24
          f32.store
          local.get 0
          i32.const 28
          i32.add
          local.get 6
          f32.load offset=28
          f32.store
          local.get 0
          i32.const 32
          i32.add
          local.get 6
          f32.load offset=32
          f32.store
          local.get 0
          i32.const 36
          i32.add
          local.get 6
          f32.load offset=36
          f32.store
          local.get 0
          i32.const 40
          i32.add
          local.get 6
          f32.load offset=40
          f32.store
          local.get 0
          i32.const 44
          i32.add
          local.get 6
          f32.load offset=44
          f32.store
          local.get 0
          i32.const 48
          i32.add
          local.get 6
          f32.load offset=48
          f32.store
          local.get 0
          i32.const 52
          i32.add
          local.get 6
          f32.load offset=52
          f32.store
          local.get 0
          i32.const 56
          i32.add
          local.get 6
          f32.load offset=56
          f32.store
          local.get 0
          i32.const 60
          i32.add
          local.get 6
          f32.load offset=60
          local.tee 7
          f32.store
          f32.const 0x0p+0 (;=0;)
          local.set 8
          f32.const 0x1p+0 (;=1;)
          local.set 9
          f32.const 0x0p+0 (;=0;)
          local.set 10
          f32.const 0x0p+0 (;=0;)
          local.set 11
          f32.const 0x0p+0 (;=0;)
          local.set 12
          f32.const 0x1p+0 (;=1;)
          local.set 13
          f32.const 0x0p+0 (;=0;)
          local.set 14
          f32.const 0x0p+0 (;=0;)
          local.set 15
          f32.const 0x0p+0 (;=0;)
          local.set 16
          f32.const 0x0p+0 (;=0;)
          local.set 17
          f32.const 0x1p+0 (;=1;)
          local.set 18
          f32.const 0x0p+0 (;=0;)
          local.set 19
          f32.const 0x0p+0 (;=0;)
          local.set 20
          f32.const 0x0p+0 (;=0;)
          local.set 21
          f32.const 0x0p+0 (;=0;)
          local.set 22
          f32.const 0x1p+0 (;=1;)
          local.set 23
          block  ;; label = @4
            local.get 6
            f32.load offset=8
            local.tee 24
            local.get 6
            f32.load offset=28
            local.tee 25
            f32.mul
            local.get 6
            f32.load offset=24
            local.tee 26
            local.get 6
            f32.load offset=12
            local.tee 27
            f32.mul
            f32.sub
            local.tee 28
            local.get 6
            f32.load offset=32
            local.tee 29
            local.get 6
            f32.load offset=52
            local.tee 30
            f32.mul
            local.get 6
            f32.load offset=36
            local.tee 31
            local.get 6
            f32.load offset=48
            local.tee 32
            f32.mul
            f32.sub
            f32.mul
            local.get 6
            f32.load offset=4
            local.tee 33
            local.get 26
            f32.mul
            local.get 6
            f32.load offset=20
            local.tee 34
            local.get 24
            f32.mul
            f32.sub
            local.tee 35
            local.get 29
            local.get 7
            f32.mul
            local.get 32
            local.get 6
            f32.load offset=44
            local.tee 36
            f32.mul
            f32.sub
            f32.mul
            local.get 6
            f32.load
            local.tee 37
            local.get 25
            f32.mul
            local.get 6
            f32.load offset=16
            local.tee 38
            local.get 27
            f32.mul
            f32.sub
            local.get 31
            local.get 6
            f32.load offset=56
            local.tee 39
            f32.mul
            local.get 30
            local.get 6
            f32.load offset=40
            local.tee 40
            f32.mul
            f32.sub
            local.tee 41
            f32.mul
            local.get 37
            local.get 34
            f32.mul
            local.get 33
            local.get 38
            f32.mul
            f32.sub
            local.get 40
            local.get 7
            f32.mul
            local.get 39
            local.get 36
            f32.mul
            f32.sub
            local.tee 42
            f32.mul
            local.get 37
            local.get 26
            f32.mul
            local.get 38
            local.get 24
            f32.mul
            f32.sub
            local.get 31
            local.get 7
            f32.mul
            local.get 30
            local.get 36
            f32.mul
            f32.sub
            local.tee 43
            f32.mul
            f32.sub
            f32.add
            f32.add
            local.get 33
            local.get 25
            f32.mul
            local.get 34
            local.get 27
            f32.mul
            f32.sub
            local.tee 44
            local.get 29
            local.get 39
            f32.mul
            local.get 32
            local.get 40
            f32.mul
            f32.sub
            f32.mul
            f32.sub
            f32.add
            local.tee 45
            f32.const 0x0p+0 (;=0;)
            f32.eq
            br_if 0 (;@4;)
            local.get 35
            local.get 29
            f32.mul
            local.get 37
            local.get 34
            local.get 40
            f32.mul
            local.get 26
            local.get 31
            f32.mul
            f32.sub
            local.tee 11
            f32.mul
            local.get 38
            local.get 33
            local.get 40
            f32.mul
            local.get 24
            local.get 31
            f32.mul
            f32.sub
            local.tee 10
            f32.mul
            f32.sub
            f32.add
            f32.const 0x1p+0 (;=1;)
            local.get 45
            f32.div
            local.tee 23
            f32.mul
            local.set 9
            local.get 38
            local.get 33
            local.get 39
            f32.mul
            local.get 24
            local.get 30
            f32.mul
            f32.sub
            local.tee 12
            f32.mul
            local.get 37
            local.get 34
            local.get 39
            f32.mul
            local.get 26
            local.get 30
            f32.mul
            f32.sub
            local.tee 13
            f32.mul
            f32.sub
            local.get 35
            local.get 32
            f32.mul
            f32.sub
            local.get 23
            f32.mul
            local.set 8
            local.get 32
            local.get 10
            f32.mul
            local.get 37
            local.get 41
            f32.mul
            local.get 29
            local.get 12
            f32.mul
            f32.sub
            f32.add
            local.get 23
            f32.mul
            local.set 10
            local.get 29
            local.get 13
            f32.mul
            local.get 38
            local.get 41
            f32.mul
            f32.sub
            local.get 32
            local.get 11
            f32.mul
            f32.sub
            local.get 23
            f32.mul
            local.set 11
            local.get 38
            local.get 33
            local.get 36
            f32.mul
            local.get 27
            local.get 31
            f32.mul
            f32.sub
            local.tee 14
            f32.mul
            local.get 37
            local.get 34
            local.get 36
            f32.mul
            local.get 25
            local.get 31
            f32.mul
            f32.sub
            local.tee 15
            f32.mul
            f32.sub
            local.get 29
            local.get 44
            f32.mul
            f32.sub
            local.get 23
            f32.mul
            local.set 12
            local.get 44
            local.get 32
            f32.mul
            local.get 37
            local.get 34
            local.get 7
            f32.mul
            local.get 25
            local.get 30
            f32.mul
            f32.sub
            local.tee 16
            f32.mul
            local.get 38
            local.get 33
            local.get 7
            f32.mul
            local.get 27
            local.get 30
            f32.mul
            f32.sub
            local.tee 17
            f32.mul
            f32.sub
            f32.add
            local.get 23
            f32.mul
            local.set 13
            local.get 29
            local.get 17
            f32.mul
            local.get 37
            local.get 43
            f32.mul
            f32.sub
            local.get 32
            local.get 14
            f32.mul
            f32.sub
            local.get 23
            f32.mul
            local.set 14
            local.get 32
            local.get 15
            f32.mul
            local.get 38
            local.get 43
            f32.mul
            local.get 29
            local.get 16
            f32.mul
            f32.sub
            f32.add
            local.get 23
            f32.mul
            local.set 15
            local.get 29
            local.get 28
            f32.mul
            local.get 37
            local.get 26
            local.get 36
            f32.mul
            local.get 25
            local.get 40
            f32.mul
            f32.sub
            local.tee 35
            f32.mul
            local.get 38
            local.get 24
            local.get 36
            f32.mul
            local.get 27
            local.get 40
            f32.mul
            f32.sub
            local.tee 36
            f32.mul
            f32.sub
            f32.add
            local.get 23
            f32.mul
            local.set 16
            local.get 38
            local.get 24
            local.get 7
            f32.mul
            local.get 27
            local.get 39
            f32.mul
            f32.sub
            local.tee 24
            f32.mul
            local.get 37
            local.get 26
            local.get 7
            f32.mul
            local.get 25
            local.get 39
            f32.mul
            f32.sub
            local.tee 7
            f32.mul
            f32.sub
            local.get 28
            local.get 32
            f32.mul
            f32.sub
            local.get 23
            f32.mul
            local.set 17
            local.get 32
            local.get 36
            f32.mul
            local.get 37
            local.get 42
            f32.mul
            local.get 29
            local.get 24
            f32.mul
            f32.sub
            f32.add
            local.get 23
            f32.mul
            local.set 18
            local.get 29
            local.get 7
            f32.mul
            local.get 38
            local.get 42
            f32.mul
            f32.sub
            local.get 32
            local.get 35
            f32.mul
            f32.sub
            local.get 23
            f32.mul
            local.set 19
            local.get 34
            local.get 36
            f32.mul
            local.get 33
            local.get 35
            f32.mul
            f32.sub
            local.get 28
            local.get 31
            f32.mul
            f32.sub
            local.get 23
            f32.mul
            local.set 20
            local.get 30
            local.get 28
            f32.mul
            local.get 33
            local.get 7
            f32.mul
            local.get 34
            local.get 24
            f32.mul
            f32.sub
            f32.add
            local.get 23
            f32.mul
            local.set 21
            local.get 31
            local.get 24
            f32.mul
            local.get 33
            local.get 42
            f32.mul
            f32.sub
            local.get 30
            local.get 36
            f32.mul
            f32.sub
            local.get 23
            f32.mul
            local.set 22
            local.get 30
            local.get 35
            f32.mul
            local.get 34
            local.get 42
            f32.mul
            local.get 31
            local.get 7
            f32.mul
            f32.sub
            f32.add
            local.get 23
            f32.mul
            local.set 23
          end
          local.get 0
          i32.const 124
          i32.add
          local.get 9
          f32.store
          local.get 0
          i32.const 120
          i32.add
          local.get 12
          f32.store
          local.get 0
          i32.const 116
          i32.add
          local.get 16
          f32.store
          local.get 0
          i32.const 112
          i32.add
          local.get 20
          f32.store
          local.get 0
          i32.const 108
          i32.add
          local.get 8
          f32.store
          local.get 0
          i32.const 104
          i32.add
          local.get 13
          f32.store
          local.get 0
          i32.const 100
          i32.add
          local.get 17
          f32.store
          local.get 0
          i32.const 96
          i32.add
          local.get 21
          f32.store
          local.get 0
          i32.const 92
          i32.add
          local.get 10
          f32.store
          local.get 0
          i32.const 88
          i32.add
          local.get 14
          f32.store
          local.get 0
          i32.const 84
          i32.add
          local.get 18
          f32.store
          local.get 0
          i32.const 80
          i32.add
          local.get 22
          f32.store
          local.get 0
          i32.const 76
          i32.add
          local.get 11
          f32.store
          local.get 0
          i32.const 72
          i32.add
          local.get 15
          f32.store
          local.get 0
          i32.const 68
          i32.add
          local.get 19
          f32.store
          local.get 0
          i32.const 64
          i32.add
          local.get 23
          f32.store
          local.get 4
          i32.const 32
          i32.add
          local.set 4
          local.get 0
          i32.const 128
          i32.add
          local.set 0
          local.get 1
          i32.const 4
          i32.add
          local.set 1
          local.get 3
          i32.const -1
          i32.add
          local.set 3
          local.get 5
          i32.const -1
          i32.add
          local.tee 5
          br_if 0 (;@3;)
        end
      end
      i32.const 0
      return
    end
    local.get 4
    local.get 2
    i32.const 5
    i32.shl
    i32.const 1048728
    call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
    unreachable)
  (func $transform_update_world_ordered (type 13) (param i32 i32 i32 i32 i32) (result i32)
    (local i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 f32 i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32 f32)
    block  ;; label = @1
      block  ;; label = @2
        block  ;; label = @3
          block  ;; label = @4
            block  ;; label = @5
              block  ;; label = @6
                block  ;; label = @7
                  block  ;; label = @8
                    block  ;; label = @9
                      block  ;; label = @10
                        block  ;; label = @11
                          block  ;; label = @12
                            block  ;; label = @13
                              block  ;; label = @14
                                block  ;; label = @15
                                  block  ;; label = @16
                                    block  ;; label = @17
                                      block  ;; label = @18
                                        block  ;; label = @19
                                          block  ;; label = @20
                                            block  ;; label = @21
                                              block  ;; label = @22
                                                block  ;; label = @23
                                                  block  ;; label = @24
                                                    block  ;; label = @25
                                                      block  ;; label = @26
                                                        local.get 4
                                                        i32.eqz
                                                        br_if 0 (;@26;)
                                                        local.get 0
                                                        i32.const 44
                                                        i32.add
                                                        local.set 5
                                                        local.get 0
                                                        i32.const 28
                                                        i32.add
                                                        local.set 6
                                                        local.get 0
                                                        i32.const 12
                                                        i32.add
                                                        local.set 7
                                                        local.get 0
                                                        i32.const 40
                                                        i32.add
                                                        local.set 8
                                                        local.get 0
                                                        i32.const 24
                                                        i32.add
                                                        local.set 9
                                                        local.get 0
                                                        i32.const 8
                                                        i32.add
                                                        local.set 10
                                                        local.get 0
                                                        i32.const 36
                                                        i32.add
                                                        local.set 11
                                                        local.get 0
                                                        i32.const 20
                                                        i32.add
                                                        local.set 12
                                                        local.get 0
                                                        i32.const 4
                                                        i32.add
                                                        local.set 13
                                                        local.get 4
                                                        i32.const 4
                                                        i32.shl
                                                        local.tee 14
                                                        i32.const 1
                                                        i32.or
                                                        local.set 15
                                                        i32.const 1
                                                        local.set 16
                                                        loop  ;; label = @27
                                                          block  ;; label = @28
                                                            local.get 3
                                                            i32.load
                                                            local.tee 17
                                                            local.get 4
                                                            i32.ge_u
                                                            br_if 0 (;@28;)
                                                            local.get 17
                                                            i32.const 4
                                                            i32.shl
                                                            local.set 18
                                                            block  ;; label = @29
                                                              block  ;; label = @30
                                                                local.get 2
                                                                local.get 17
                                                                i32.const 2
                                                                i32.shl
                                                                i32.add
                                                                i32.load
                                                                local.tee 17
                                                                local.get 4
                                                                i32.lt_u
                                                                br_if 0 (;@30;)
                                                                local.get 18
                                                                local.get 14
                                                                local.get 18
                                                                local.get 14
                                                                i32.gt_u
                                                                select
                                                                i32.const 1
                                                                i32.or
                                                                local.get 18
                                                                i32.sub
                                                                i32.const 1
                                                                i32.eq
                                                                br_if 6 (;@24;)
                                                                local.get 0
                                                                local.get 18
                                                                i32.const 2
                                                                i32.shl
                                                                local.tee 17
                                                                i32.add
                                                                local.get 1
                                                                local.get 17
                                                                i32.add
                                                                f32.load
                                                                f32.store
                                                                local.get 0
                                                                local.get 17
                                                                i32.const 4
                                                                i32.or
                                                                local.tee 19
                                                                i32.add
                                                                local.get 1
                                                                local.get 19
                                                                i32.add
                                                                f32.load
                                                                f32.store
                                                                local.get 0
                                                                local.get 17
                                                                i32.const 8
                                                                i32.or
                                                                local.tee 19
                                                                i32.add
                                                                local.get 1
                                                                local.get 19
                                                                i32.add
                                                                f32.load
                                                                f32.store
                                                                local.get 0
                                                                local.get 17
                                                                i32.const 12
                                                                i32.or
                                                                local.tee 19
                                                                i32.add
                                                                local.get 1
                                                                local.get 19
                                                                i32.add
                                                                f32.load
                                                                f32.store
                                                                local.get 0
                                                                local.get 17
                                                                i32.const 16
                                                                i32.or
                                                                local.tee 19
                                                                i32.add
                                                                local.get 1
                                                                local.get 19
                                                                i32.add
                                                                f32.load
                                                                f32.store
                                                                local.get 0
                                                                local.get 17
                                                                i32.const 20
                                                                i32.or
                                                                local.tee 19
                                                                i32.add
                                                                local.get 1
                                                                local.get 19
                                                                i32.add
                                                                f32.load
                                                                f32.store
                                                                local.get 0
                                                                local.get 17
                                                                i32.const 24
                                                                i32.or
                                                                local.tee 19
                                                                i32.add
                                                                local.get 1
                                                                local.get 19
                                                                i32.add
                                                                f32.load
                                                                f32.store
                                                                local.get 0
                                                                local.get 17
                                                                i32.const 28
                                                                i32.or
                                                                local.tee 19
                                                                i32.add
                                                                local.get 1
                                                                local.get 19
                                                                i32.add
                                                                f32.load
                                                                f32.store
                                                                local.get 0
                                                                local.get 17
                                                                i32.const 32
                                                                i32.or
                                                                local.tee 19
                                                                i32.add
                                                                local.get 1
                                                                local.get 19
                                                                i32.add
                                                                f32.load
                                                                f32.store
                                                                local.get 0
                                                                local.get 17
                                                                i32.const 36
                                                                i32.or
                                                                local.tee 19
                                                                i32.add
                                                                local.get 1
                                                                local.get 19
                                                                i32.add
                                                                f32.load
                                                                f32.store
                                                                local.get 0
                                                                local.get 17
                                                                i32.const 40
                                                                i32.or
                                                                local.tee 19
                                                                i32.add
                                                                local.get 1
                                                                local.get 19
                                                                i32.add
                                                                f32.load
                                                                f32.store
                                                                local.get 0
                                                                local.get 17
                                                                i32.const 44
                                                                i32.or
                                                                local.tee 19
                                                                i32.add
                                                                local.get 1
                                                                local.get 19
                                                                i32.add
                                                                f32.load
                                                                f32.store
                                                                local.get 0
                                                                local.get 17
                                                                i32.const 48
                                                                i32.or
                                                                local.tee 19
                                                                i32.add
                                                                local.get 1
                                                                local.get 19
                                                                i32.add
                                                                f32.load
                                                                f32.store
                                                                local.get 0
                                                                local.get 17
                                                                i32.const 52
                                                                i32.or
                                                                local.tee 19
                                                                i32.add
                                                                local.get 1
                                                                local.get 19
                                                                i32.add
                                                                f32.load
                                                                f32.store
                                                                local.get 0
                                                                local.get 17
                                                                i32.const 56
                                                                i32.or
                                                                local.tee 17
                                                                i32.add
                                                                local.get 1
                                                                local.get 17
                                                                i32.add
                                                                f32.load
                                                                f32.store
                                                                local.get 1
                                                                local.get 18
                                                                i32.const 15
                                                                i32.or
                                                                local.tee 19
                                                                i32.const 2
                                                                i32.shl
                                                                i32.add
                                                                f32.load
                                                                local.set 20
                                                                br 1 (;@29;)
                                                              end
                                                              local.get 17
                                                              i32.const 4
                                                              i32.shl
                                                              local.tee 17
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 6 (;@23;)
                                                              local.get 18
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 7 (;@22;)
                                                              local.get 17
                                                              i32.const 4
                                                              i32.or
                                                              local.tee 21
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 8 (;@21;)
                                                              local.get 18
                                                              i32.const 1
                                                              i32.or
                                                              local.tee 22
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 9 (;@20;)
                                                              local.get 17
                                                              i32.const 8
                                                              i32.or
                                                              local.tee 23
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 10 (;@19;)
                                                              local.get 18
                                                              i32.const 2
                                                              i32.or
                                                              local.tee 24
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 11 (;@18;)
                                                              local.get 17
                                                              i32.const 12
                                                              i32.or
                                                              local.tee 25
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 12 (;@17;)
                                                              local.get 18
                                                              i32.const 3
                                                              i32.or
                                                              local.tee 26
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 13 (;@16;)
                                                              local.get 17
                                                              i32.const 13
                                                              i32.or
                                                              local.tee 27
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 14 (;@15;)
                                                              local.get 17
                                                              i32.const 14
                                                              i32.or
                                                              local.tee 28
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 15 (;@14;)
                                                              local.get 17
                                                              i32.const 15
                                                              i32.or
                                                              local.tee 29
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 16 (;@13;)
                                                              local.get 18
                                                              i32.const 4
                                                              i32.or
                                                              local.tee 30
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 17 (;@12;)
                                                              local.get 18
                                                              i32.const 5
                                                              i32.or
                                                              local.tee 31
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 18 (;@11;)
                                                              local.get 18
                                                              i32.const 6
                                                              i32.or
                                                              local.tee 32
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 19 (;@10;)
                                                              local.get 18
                                                              i32.const 7
                                                              i32.or
                                                              local.tee 33
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 20 (;@9;)
                                                              local.get 18
                                                              i32.const 8
                                                              i32.or
                                                              local.tee 34
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 21 (;@8;)
                                                              local.get 18
                                                              i32.const 9
                                                              i32.or
                                                              local.tee 35
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 22 (;@7;)
                                                              local.get 18
                                                              i32.const 10
                                                              i32.or
                                                              local.tee 36
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 23 (;@6;)
                                                              local.get 18
                                                              i32.const 11
                                                              i32.or
                                                              local.tee 37
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 24 (;@5;)
                                                              local.get 18
                                                              i32.const 12
                                                              i32.or
                                                              local.tee 38
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 25 (;@4;)
                                                              local.get 18
                                                              i32.const 13
                                                              i32.or
                                                              local.tee 39
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 26 (;@3;)
                                                              local.get 18
                                                              i32.const 14
                                                              i32.or
                                                              local.tee 40
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 27 (;@2;)
                                                              local.get 18
                                                              i32.const 15
                                                              i32.or
                                                              local.tee 19
                                                              local.get 14
                                                              i32.ge_u
                                                              br_if 28 (;@1;)
                                                              local.get 15
                                                              local.get 18
                                                              i32.sub
                                                              i32.const 1
                                                              i32.eq
                                                              br_if 4 (;@25;)
                                                              local.get 0
                                                              local.get 17
                                                              i32.const 2
                                                              i32.shl
                                                              local.tee 17
                                                              i32.add
                                                              f32.load
                                                              local.set 20
                                                              local.get 0
                                                              local.get 21
                                                              i32.const 2
                                                              i32.shl
                                                              i32.add
                                                              f32.load
                                                              local.set 41
                                                              local.get 0
                                                              local.get 23
                                                              i32.const 2
                                                              i32.shl
                                                              i32.add
                                                              f32.load
                                                              local.set 42
                                                              local.get 0
                                                              local.get 25
                                                              i32.const 2
                                                              i32.shl
                                                              i32.add
                                                              f32.load
                                                              local.set 43
                                                              local.get 8
                                                              local.get 17
                                                              i32.add
                                                              f32.load
                                                              local.set 44
                                                              local.get 9
                                                              local.get 17
                                                              i32.add
                                                              f32.load
                                                              local.set 45
                                                              local.get 10
                                                              local.get 17
                                                              i32.add
                                                              f32.load
                                                              local.set 46
                                                              local.get 0
                                                              local.get 28
                                                              i32.const 2
                                                              i32.shl
                                                              i32.add
                                                              f32.load
                                                              local.set 47
                                                              local.get 5
                                                              local.get 17
                                                              i32.add
                                                              f32.load
                                                              local.set 48
                                                              local.get 6
                                                              local.get 17
                                                              i32.add
                                                              f32.load
                                                              local.set 49
                                                              local.get 7
                                                              local.get 17
                                                              i32.add
                                                              f32.load
                                                              local.set 50
                                                              local.get 0
                                                              local.get 29
                                                              i32.const 2
                                                              i32.shl
                                                              i32.add
                                                              f32.load
                                                              local.set 51
                                                              local.get 1
                                                              local.get 30
                                                              i32.const 2
                                                              i32.shl
                                                              local.tee 21
                                                              i32.add
                                                              f32.load
                                                              local.set 52
                                                              local.get 1
                                                              local.get 31
                                                              i32.const 2
                                                              i32.shl
                                                              local.tee 23
                                                              i32.add
                                                              f32.load
                                                              local.set 53
                                                              local.get 1
                                                              local.get 32
                                                              i32.const 2
                                                              i32.shl
                                                              local.tee 25
                                                              i32.add
                                                              f32.load
                                                              local.set 54
                                                              local.get 1
                                                              local.get 33
                                                              i32.const 2
                                                              i32.shl
                                                              local.tee 28
                                                              i32.add
                                                              f32.load
                                                              local.set 55
                                                              local.get 1
                                                              local.get 34
                                                              i32.const 2
                                                              i32.shl
                                                              local.tee 29
                                                              i32.add
                                                              f32.load
                                                              local.set 56
                                                              local.get 1
                                                              local.get 35
                                                              i32.const 2
                                                              i32.shl
                                                              local.tee 30
                                                              i32.add
                                                              f32.load
                                                              local.set 57
                                                              local.get 1
                                                              local.get 36
                                                              i32.const 2
                                                              i32.shl
                                                              local.tee 31
                                                              i32.add
                                                              f32.load
                                                              local.set 58
                                                              local.get 1
                                                              local.get 37
                                                              i32.const 2
                                                              i32.shl
                                                              local.tee 32
                                                              i32.add
                                                              f32.load
                                                              local.set 59
                                                              local.get 1
                                                              local.get 38
                                                              i32.const 2
                                                              i32.shl
                                                              local.tee 33
                                                              i32.add
                                                              f32.load
                                                              local.set 60
                                                              local.get 1
                                                              local.get 39
                                                              i32.const 2
                                                              i32.shl
                                                              local.tee 34
                                                              i32.add
                                                              f32.load
                                                              local.set 61
                                                              local.get 1
                                                              local.get 19
                                                              i32.const 2
                                                              i32.shl
                                                              i32.add
                                                              f32.load
                                                              local.set 62
                                                              local.get 1
                                                              local.get 40
                                                              i32.const 2
                                                              i32.shl
                                                              local.tee 35
                                                              i32.add
                                                              f32.load
                                                              local.set 63
                                                              local.get 0
                                                              local.get 22
                                                              i32.const 2
                                                              i32.shl
                                                              local.tee 22
                                                              i32.add
                                                              local.get 1
                                                              local.get 18
                                                              i32.const 2
                                                              i32.shl
                                                              local.tee 18
                                                              i32.add
                                                              f32.load
                                                              local.tee 64
                                                              local.get 13
                                                              local.get 17
                                                              i32.add
                                                              f32.load
                                                              local.tee 65
                                                              f32.mul
                                                              local.get 1
                                                              local.get 22
                                                              i32.add
                                                              f32.load
                                                              local.tee 66
                                                              local.get 12
                                                              local.get 17
                                                              i32.add
                                                              f32.load
                                                              local.tee 67
                                                              f32.mul
                                                              f32.add
                                                              local.get 1
                                                              local.get 24
                                                              i32.const 2
                                                              i32.shl
                                                              local.tee 22
                                                              i32.add
                                                              f32.load
                                                              local.tee 68
                                                              local.get 11
                                                              local.get 17
                                                              i32.add
                                                              f32.load
                                                              local.tee 69
                                                              f32.mul
                                                              f32.add
                                                              local.get 1
                                                              local.get 26
                                                              i32.const 2
                                                              i32.shl
                                                              local.tee 17
                                                              i32.add
                                                              f32.load
                                                              local.tee 70
                                                              local.get 0
                                                              local.get 27
                                                              i32.const 2
                                                              i32.shl
                                                              i32.add
                                                              f32.load
                                                              local.tee 71
                                                              f32.mul
                                                              f32.add
                                                              f32.store
                                                              local.get 0
                                                              local.get 18
                                                              i32.add
                                                              local.get 20
                                                              local.get 64
                                                              f32.mul
                                                              local.get 41
                                                              local.get 66
                                                              f32.mul
                                                              f32.add
                                                              local.get 42
                                                              local.get 68
                                                              f32.mul
                                                              f32.add
                                                              local.get 43
                                                              local.get 70
                                                              f32.mul
                                                              f32.add
                                                              f32.store
                                                              local.get 0
                                                              local.get 22
                                                              i32.add
                                                              local.get 64
                                                              local.get 46
                                                              f32.mul
                                                              local.get 66
                                                              local.get 45
                                                              f32.mul
                                                              f32.add
                                                              local.get 68
                                                              local.get 44
                                                              f32.mul
                                                              f32.add
                                                              local.get 70
                                                              local.get 47
                                                              f32.mul
                                                              f32.add
                                                              f32.store
                                                              local.get 0
                                                              local.get 17
                                                              i32.add
                                                              local.get 64
                                                              local.get 50
                                                              f32.mul
                                                              local.get 66
                                                              local.get 49
                                                              f32.mul
                                                              f32.add
                                                              local.get 68
                                                              local.get 48
                                                              f32.mul
                                                              f32.add
                                                              local.get 70
                                                              local.get 51
                                                              f32.mul
                                                              f32.add
                                                              f32.store
                                                              local.get 0
                                                              local.get 21
                                                              i32.add
                                                              local.get 20
                                                              local.get 52
                                                              f32.mul
                                                              local.get 41
                                                              local.get 53
                                                              f32.mul
                                                              f32.add
                                                              local.get 42
                                                              local.get 54
                                                              f32.mul
                                                              f32.add
                                                              local.get 43
                                                              local.get 55
                                                              f32.mul
                                                              f32.add
                                                              f32.store
                                                              local.get 0
                                                              local.get 23
                                                              i32.add
                                                              local.get 65
                                                              local.get 52
                                                              f32.mul
                                                              local.get 67
                                                              local.get 53
                                                              f32.mul
                                                              f32.add
                                                              local.get 69
                                                              local.get 54
                                                              f32.mul
                                                              f32.add
                                                              local.get 71
                                                              local.get 55
                                                              f32.mul
                                                              f32.add
                                                              f32.store
                                                              local.get 0
                                                              local.get 25
                                                              i32.add
                                                              local.get 46
                                                              local.get 52
                                                              f32.mul
                                                              local.get 45
                                                              local.get 53
                                                              f32.mul
                                                              f32.add
                                                              local.get 44
                                                              local.get 54
                                                              f32.mul
                                                              f32.add
                                                              local.get 47
                                                              local.get 55
                                                              f32.mul
                                                              f32.add
                                                              f32.store
                                                              local.get 0
                                                              local.get 28
                                                              i32.add
                                                              local.get 50
                                                              local.get 52
                                                              f32.mul
                                                              local.get 49
                                                              local.get 53
                                                              f32.mul
                                                              f32.add
                                                              local.get 48
                                                              local.get 54
                                                              f32.mul
                                                              f32.add
                                                              local.get 51
                                                              local.get 55
                                                              f32.mul
                                                              f32.add
                                                              f32.store
                                                              local.get 0
                                                              local.get 29
                                                              i32.add
                                                              local.get 20
                                                              local.get 56
                                                              f32.mul
                                                              local.get 41
                                                              local.get 57
                                                              f32.mul
                                                              f32.add
                                                              local.get 42
                                                              local.get 58
                                                              f32.mul
                                                              f32.add
                                                              local.get 43
                                                              local.get 59
                                                              f32.mul
                                                              f32.add
                                                              f32.store
                                                              local.get 0
                                                              local.get 30
                                                              i32.add
                                                              local.get 65
                                                              local.get 56
                                                              f32.mul
                                                              local.get 67
                                                              local.get 57
                                                              f32.mul
                                                              f32.add
                                                              local.get 69
                                                              local.get 58
                                                              f32.mul
                                                              f32.add
                                                              local.get 71
                                                              local.get 59
                                                              f32.mul
                                                              f32.add
                                                              f32.store
                                                              local.get 0
                                                              local.get 31
                                                              i32.add
                                                              local.get 46
                                                              local.get 56
                                                              f32.mul
                                                              local.get 45
                                                              local.get 57
                                                              f32.mul
                                                              f32.add
                                                              local.get 44
                                                              local.get 58
                                                              f32.mul
                                                              f32.add
                                                              local.get 47
                                                              local.get 59
                                                              f32.mul
                                                              f32.add
                                                              f32.store
                                                              local.get 0
                                                              local.get 32
                                                              i32.add
                                                              local.get 50
                                                              local.get 56
                                                              f32.mul
                                                              local.get 49
                                                              local.get 57
                                                              f32.mul
                                                              f32.add
                                                              local.get 48
                                                              local.get 58
                                                              f32.mul
                                                              f32.add
                                                              local.get 51
                                                              local.get 59
                                                              f32.mul
                                                              f32.add
                                                              f32.store
                                                              local.get 0
                                                              local.get 33
                                                              i32.add
                                                              local.get 20
                                                              local.get 60
                                                              f32.mul
                                                              local.get 41
                                                              local.get 61
                                                              f32.mul
                                                              f32.add
                                                              local.get 42
                                                              local.get 63
                                                              f32.mul
                                                              f32.add
                                                              local.get 43
                                                              local.get 62
                                                              f32.mul
                                                              f32.add
                                                              f32.store
                                                              local.get 0
                                                              local.get 34
                                                              i32.add
                                                              local.get 65
                                                              local.get 60
                                                              f32.mul
                                                              local.get 67
                                                              local.get 61
                                                              f32.mul
                                                              f32.add
                                                              local.get 69
                                                              local.get 63
                                                              f32.mul
                                                              f32.add
                                                              local.get 71
                                                              local.get 62
                                                              f32.mul
                                                              f32.add
                                                              f32.store
                                                              local.get 0
                                                              local.get 35
                                                              i32.add
                                                              local.get 46
                                                              local.get 60
                                                              f32.mul
                                                              local.get 45
                                                              local.get 61
                                                              f32.mul
                                                              f32.add
                                                              local.get 44
                                                              local.get 63
                                                              f32.mul
                                                              f32.add
                                                              local.get 47
                                                              local.get 62
                                                              f32.mul
                                                              f32.add
                                                              f32.store
                                                              local.get 50
                                                              local.get 60
                                                              f32.mul
                                                              local.get 49
                                                              local.get 61
                                                              f32.mul
                                                              f32.add
                                                              local.get 48
                                                              local.get 63
                                                              f32.mul
                                                              f32.add
                                                              local.get 51
                                                              local.get 62
                                                              f32.mul
                                                              f32.add
                                                              local.set 20
                                                            end
                                                            local.get 0
                                                            local.get 19
                                                            i32.const 2
                                                            i32.shl
                                                            i32.add
                                                            local.get 20
                                                            f32.store
                                                          end
                                                          local.get 3
                                                          i32.const 4
                                                          i32.add
                                                          local.set 3
                                                          local.get 16
                                                          local.get 4
                                                          i32.lt_u
                                                          local.set 18
                                                          local.get 16
                                                          i32.const 1
                                                          i32.add
                                                          local.set 16
                                                          local.get 18
                                                          br_if 0 (;@27;)
                                                        end
                                                      end
                                                      i32.const 0
                                                      return
                                                    end
                                                    local.get 18
                                                    local.get 14
                                                    i32.const 1049112
                                                    call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                                                    unreachable
                                                  end
                                                  local.get 18
                                                  local.get 14
                                                  i32.const 1049128
                                                  call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                                                  unreachable
                                                end
                                                local.get 17
                                                local.get 14
                                                i32.const 1048744
                                                call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                                                unreachable
                                              end
                                              local.get 18
                                              local.get 14
                                              i32.const 1048760
                                              call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                                              unreachable
                                            end
                                            local.get 21
                                            local.get 14
                                            i32.const 1048776
                                            call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                                            unreachable
                                          end
                                          local.get 22
                                          local.get 14
                                          i32.const 1048792
                                          call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                                          unreachable
                                        end
                                        local.get 23
                                        local.get 14
                                        i32.const 1048808
                                        call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                                        unreachable
                                      end
                                      local.get 24
                                      local.get 14
                                      i32.const 1048824
                                      call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                                      unreachable
                                    end
                                    local.get 25
                                    local.get 14
                                    i32.const 1048840
                                    call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                                    unreachable
                                  end
                                  local.get 26
                                  local.get 14
                                  i32.const 1048856
                                  call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                                  unreachable
                                end
                                local.get 27
                                local.get 14
                                i32.const 1048872
                                call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                                unreachable
                              end
                              local.get 28
                              local.get 14
                              i32.const 1048888
                              call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                              unreachable
                            end
                            local.get 29
                            local.get 14
                            i32.const 1048904
                            call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                            unreachable
                          end
                          local.get 30
                          local.get 14
                          i32.const 1048920
                          call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                          unreachable
                        end
                        local.get 31
                        local.get 14
                        i32.const 1048936
                        call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                        unreachable
                      end
                      local.get 32
                      local.get 14
                      i32.const 1048952
                      call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                      unreachable
                    end
                    local.get 33
                    local.get 14
                    i32.const 1048968
                    call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                    unreachable
                  end
                  local.get 34
                  local.get 14
                  i32.const 1048984
                  call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                  unreachable
                end
                local.get 35
                local.get 14
                i32.const 1049000
                call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
                unreachable
              end
              local.get 36
              local.get 14
              i32.const 1049016
              call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
              unreachable
            end
            local.get 37
            local.get 14
            i32.const 1049032
            call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
            unreachable
          end
          local.get 38
          local.get 14
          i32.const 1049048
          call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
          unreachable
        end
        local.get 39
        local.get 14
        i32.const 1049064
        call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
        unreachable
      end
      local.get 40
      local.get 14
      i32.const 1049080
      call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
      unreachable
    end
    local.get 19
    local.get 14
    i32.const 1049096
    call $_ZN4core9panicking18panic_bounds_check17h4991f934eb87d093E
    unreachable)
  (func $vec3_abs (type 0) (param i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    f32.abs
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    f32.abs
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    f32.abs
    f32.store offset=8
    i32.const 0)
  (func $vec3_add (type 1) (param i32 i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    local.get 2
    f32.load
    f32.add
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    local.get 2
    f32.load offset=4
    f32.add
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    local.get 2
    f32.load offset=8
    f32.add
    f32.store offset=8
    i32.const 0)
  (func $vec3_ang (type 0) (param i32 i32) (result i32)
    (local f32 f32 f32)
    local.get 0
    local.get 1
    f32.load
    local.tee 2
    local.get 2
    local.get 2
    f32.mul
    local.get 1
    f32.load offset=4
    local.tee 2
    local.get 2
    f32.mul
    f32.add
    local.get 1
    f32.load offset=8
    local.tee 3
    local.get 3
    f32.mul
    f32.add
    f32.sqrt
    local.tee 4
    f32.div
    call $acosf
    f32.store
    local.get 0
    local.get 2
    local.get 4
    f32.div
    call $acosf
    f32.store offset=4
    local.get 0
    local.get 3
    local.get 4
    f32.div
    call $acosf
    f32.store offset=8
    i32.const 0)
  (func $vec3_angBetween (type 11) (param i32 i32) (result f32)
    (local f32 f32 f32 f32 f32 f32 f32 f32 f32)
    f32.const 0x0p+0 (;=0;)
    local.set 2
    block  ;; label = @1
      local.get 0
      f32.load
      local.tee 3
      local.get 3
      f32.mul
      local.get 0
      f32.load offset=4
      local.tee 4
      local.get 4
      f32.mul
      f32.add
      local.get 0
      f32.load offset=8
      local.tee 5
      local.get 5
      f32.mul
      f32.add
      local.tee 6
      f32.const 0x0p+0 (;=0;)
      f32.eq
      br_if 0 (;@1;)
      local.get 1
      f32.load
      local.tee 7
      local.get 7
      f32.mul
      local.get 1
      f32.load offset=4
      local.tee 8
      local.get 8
      f32.mul
      f32.add
      local.get 1
      f32.load offset=8
      local.tee 9
      local.get 9
      f32.mul
      f32.add
      local.tee 10
      f32.const 0x0p+0 (;=0;)
      f32.eq
      br_if 0 (;@1;)
      local.get 3
      local.get 7
      f32.mul
      local.get 4
      local.get 8
      f32.mul
      f32.add
      local.get 5
      local.get 9
      f32.mul
      f32.add
      local.get 6
      f32.sqrt
      local.get 10
      f32.sqrt
      f32.mul
      f32.div
      call $acosf
      local.set 2
    end
    local.get 2)
  (func $vec3_copy (type 0) (param i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    f32.store offset=8
    i32.const 0)
  (func $vec3_cross (type 1) (param i32 i32 i32) (result i32)
    (local f32 f32 f32 f32 f32 f32)
    local.get 1
    f32.load offset=8
    local.set 3
    local.get 2
    f32.load offset=8
    local.set 4
    local.get 0
    local.get 1
    f32.load
    local.tee 5
    local.get 2
    f32.load offset=4
    local.tee 6
    f32.mul
    local.get 1
    f32.load offset=4
    local.tee 7
    local.get 2
    f32.load
    local.tee 8
    f32.mul
    f32.sub
    f32.store offset=8
    local.get 0
    local.get 3
    local.get 8
    f32.mul
    local.get 5
    local.get 4
    f32.mul
    f32.sub
    f32.store offset=4
    local.get 0
    local.get 7
    local.get 4
    f32.mul
    local.get 3
    local.get 6
    f32.mul
    f32.sub
    f32.store
    i32.const 0)
  (func $vec3_dist (type 11) (param i32 i32) (result f32)
    (local f32)
    local.get 0
    f32.load
    local.get 1
    f32.load
    f32.sub
    local.tee 2
    local.get 2
    f32.mul
    local.get 0
    f32.load offset=4
    local.get 1
    f32.load offset=4
    f32.sub
    local.tee 2
    local.get 2
    f32.mul
    f32.add
    local.get 0
    f32.load offset=8
    local.get 1
    f32.load offset=8
    f32.sub
    local.tee 2
    local.get 2
    f32.mul
    f32.add
    f32.sqrt)
  (func $vec3_distsq (type 11) (param i32 i32) (result f32)
    (local f32)
    local.get 0
    f32.load
    local.get 1
    f32.load
    f32.sub
    local.tee 2
    local.get 2
    f32.mul
    local.get 0
    f32.load offset=4
    local.get 1
    f32.load offset=4
    f32.sub
    local.tee 2
    local.get 2
    f32.mul
    f32.add
    local.get 0
    f32.load offset=8
    local.get 1
    f32.load offset=8
    f32.sub
    local.tee 2
    local.get 2
    f32.mul
    f32.add)
  (func $vec3_dot (type 11) (param i32 i32) (result f32)
    local.get 0
    f32.load
    local.get 1
    f32.load
    f32.mul
    local.get 0
    f32.load offset=4
    local.get 1
    f32.load offset=4
    f32.mul
    f32.add
    local.get 0
    f32.load offset=8
    local.get 1
    f32.load offset=8
    f32.mul
    f32.add)
  (func $vec3_init (type 15) (param i32 f32 f32 f32) (result i32)
    local.get 0
    local.get 3
    f32.store offset=8
    local.get 0
    local.get 2
    f32.store offset=4
    local.get 0
    local.get 1
    f32.store
    i32.const 0)
  (func $vec3_interp (type 16) (param i32 i32 f32 f32 f32) (result i32)
    local.get 0
    local.get 2
    local.get 1
    f32.load
    f32.mul
    local.get 3
    local.get 1
    f32.load offset=4
    f32.mul
    f32.add
    local.get 4
    local.get 1
    f32.load offset=8
    f32.mul
    f32.add
    local.get 2
    local.get 3
    f32.add
    local.get 4
    f32.add
    f32.div
    local.tee 3
    f32.store offset=8
    local.get 0
    local.get 3
    f32.store offset=4
    local.get 0
    local.get 3
    f32.store
    i32.const 0)
  (func $vec3_isEqual (type 0) (param i32 i32) (result i32)
    (local i32)
    i32.const 0
    local.set 2
    block  ;; label = @1
      local.get 0
      f32.load
      local.get 1
      f32.load
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=4
      local.get 1
      f32.load offset=4
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=8
      local.get 1
      f32.load offset=8
      f32.ne
      br_if 0 (;@1;)
      i32.const 1
      local.set 2
    end
    local.get 2)
  (func $vec3_isNormalized (type 4) (param i32) (result i32)
    (local f32)
    local.get 0
    f32.load
    local.tee 1
    local.get 1
    f32.mul
    local.get 0
    f32.load offset=4
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=8
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    f32.const 0x1p+0 (;=1;)
    f32.eq)
  (func $vec3_isOrthogonal (type 0) (param i32 i32) (result i32)
    local.get 0
    f32.load
    local.get 1
    f32.load
    f32.mul
    local.get 0
    f32.load offset=4
    local.get 1
    f32.load offset=4
    f32.mul
    f32.add
    local.get 0
    f32.load offset=8
    local.get 1
    f32.load offset=8
    f32.mul
    f32.add
    f32.const 0x0p+0 (;=0;)
    f32.eq)
  (func $vec3_isParallel (type 0) (param i32 i32) (result i32)
    (local f32 f32 f32 f32 f32 f32)
    local.get 0
    f32.load
    local.tee 2
    local.get 1
    f32.load
    local.tee 3
    f32.mul
    local.get 0
    f32.load offset=4
    local.tee 4
    local.get 1
    f32.load offset=4
    local.tee 5
    f32.mul
    f32.add
    local.get 0
    f32.load offset=8
    local.tee 6
    local.get 1
    f32.load offset=8
    local.tee 7
    f32.mul
    f32.add
    local.get 2
    local.get 2
    f32.mul
    local.get 4
    local.get 4
    f32.mul
    f32.add
    local.get 6
    local.get 6
    f32.mul
    f32.add
    f32.sqrt
    local.get 3
    local.get 3
    f32.mul
    local.get 5
    local.get 5
    f32.mul
    f32.add
    local.get 7
    local.get 7
    f32.mul
    f32.add
    f32.sqrt
    f32.mul
    f32.eq)
  (func $vec3_isZero (type 4) (param i32) (result i32)
    (local i32)
    i32.const 0
    local.set 1
    block  ;; label = @1
      local.get 0
      f32.load
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=4
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      local.get 0
      f32.load offset=8
      f32.const 0x0p+0 (;=0;)
      f32.ne
      br_if 0 (;@1;)
      i32.const 1
      local.set 1
    end
    local.get 1)
  (func $vec3_neg (type 0) (param i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    f32.neg
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    f32.neg
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    f32.neg
    f32.store offset=8
    i32.const 0)
  (func $vec3_norm (type 3) (param i32) (result f32)
    (local f32)
    local.get 0
    f32.load
    local.tee 1
    local.get 1
    f32.mul
    local.get 0
    f32.load offset=4
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=8
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    f32.sqrt)
  (func $vec3_normalize (type 0) (param i32 i32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32)
    f32.const 0x0p+0 (;=0;)
    local.set 2
    f32.const 0x0p+0 (;=0;)
    local.set 3
    f32.const 0x0p+0 (;=0;)
    local.set 4
    block  ;; label = @1
      local.get 1
      f32.load
      local.tee 5
      local.get 5
      f32.mul
      local.get 1
      f32.load offset=4
      local.tee 6
      local.get 6
      f32.mul
      f32.add
      local.get 1
      f32.load offset=8
      local.tee 7
      local.get 7
      f32.mul
      f32.add
      local.tee 8
      f32.const 0x0p+0 (;=0;)
      f32.eq
      br_if 0 (;@1;)
      local.get 7
      local.get 8
      f32.sqrt
      local.tee 2
      f32.div
      local.set 4
      local.get 6
      local.get 2
      f32.div
      local.set 3
      local.get 5
      local.get 2
      f32.div
      local.set 2
    end
    local.get 0
    local.get 4
    f32.store offset=8
    local.get 0
    local.get 3
    f32.store offset=4
    local.get 0
    local.get 2
    f32.store
    i32.const 0)
  (func $vec3_normscl (type 10) (param i32 i32 f32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32)
    f32.const 0x0p+0 (;=0;)
    local.set 3
    f32.const 0x0p+0 (;=0;)
    local.set 4
    f32.const 0x0p+0 (;=0;)
    local.set 5
    block  ;; label = @1
      local.get 1
      f32.load
      local.tee 6
      local.get 6
      f32.mul
      local.get 1
      f32.load offset=4
      local.tee 7
      local.get 7
      f32.mul
      f32.add
      local.get 1
      f32.load offset=8
      local.tee 8
      local.get 8
      f32.mul
      f32.add
      local.tee 9
      f32.const 0x0p+0 (;=0;)
      f32.eq
      br_if 0 (;@1;)
      local.get 2
      local.get 8
      f32.const 0x1p+0 (;=1;)
      local.get 9
      f32.sqrt
      f32.div
      local.tee 3
      f32.mul
      f32.mul
      local.set 5
      local.get 2
      local.get 7
      local.get 3
      f32.mul
      f32.mul
      local.set 4
      local.get 2
      local.get 6
      local.get 3
      f32.mul
      f32.mul
      local.set 3
    end
    local.get 0
    local.get 5
    f32.store offset=8
    local.get 0
    local.get 4
    f32.store offset=4
    local.get 0
    local.get 3
    f32.store
    i32.const 0)
  (func $vec3_normsq (type 3) (param i32) (result f32)
    (local f32)
    local.get 0
    f32.load
    local.tee 1
    local.get 1
    f32.mul
    local.get 0
    f32.load offset=4
    local.tee 1
    local.get 1
    f32.mul
    f32.add
    local.get 0
    f32.load offset=8
    local.tee 1
    local.get 1
    f32.mul
    f32.add)
  (func $vec3_oproj (type 1) (param i32 i32 i32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32 f32)
    f32.const 0x0p+0 (;=0;)
    local.set 3
    local.get 1
    f32.load
    local.set 4
    f32.const 0x0p+0 (;=0;)
    local.set 5
    f32.const 0x0p+0 (;=0;)
    local.set 6
    block  ;; label = @1
      local.get 2
      f32.load
      local.tee 7
      local.get 7
      f32.mul
      local.get 2
      f32.load offset=4
      local.tee 8
      local.get 8
      f32.mul
      f32.add
      local.get 2
      f32.load offset=8
      local.tee 9
      local.get 9
      f32.mul
      f32.add
      local.tee 10
      f32.const 0x0p+0 (;=0;)
      f32.eq
      br_if 0 (;@1;)
      local.get 9
      local.get 7
      local.get 4
      f32.mul
      local.get 8
      local.get 1
      f32.load offset=4
      f32.mul
      f32.add
      local.get 9
      local.get 1
      f32.load offset=8
      f32.mul
      f32.add
      local.get 10
      f32.div
      local.tee 3
      f32.mul
      local.set 6
      local.get 8
      local.get 3
      f32.mul
      local.set 5
      local.get 7
      local.get 3
      f32.mul
      local.set 3
    end
    local.get 0
    local.get 4
    local.get 3
    f32.sub
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    local.get 5
    f32.sub
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    local.get 6
    f32.sub
    f32.store offset=8
    i32.const 0)
  (func $vec3_proj (type 1) (param i32 i32 i32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32)
    f32.const 0x0p+0 (;=0;)
    local.set 3
    f32.const 0x0p+0 (;=0;)
    local.set 4
    f32.const 0x0p+0 (;=0;)
    local.set 5
    block  ;; label = @1
      local.get 2
      f32.load
      local.tee 6
      local.get 6
      f32.mul
      local.get 2
      f32.load offset=4
      local.tee 7
      local.get 7
      f32.mul
      f32.add
      local.get 2
      f32.load offset=8
      local.tee 8
      local.get 8
      f32.mul
      f32.add
      local.tee 9
      f32.const 0x0p+0 (;=0;)
      f32.eq
      br_if 0 (;@1;)
      local.get 8
      local.get 6
      local.get 1
      f32.load
      f32.mul
      local.get 7
      local.get 1
      f32.load offset=4
      f32.mul
      f32.add
      local.get 8
      local.get 1
      f32.load offset=8
      f32.mul
      f32.add
      local.get 9
      f32.div
      local.tee 3
      f32.mul
      local.set 5
      local.get 7
      local.get 3
      f32.mul
      local.set 4
      local.get 6
      local.get 3
      f32.mul
      local.set 3
    end
    local.get 0
    local.get 5
    f32.store offset=8
    local.get 0
    local.get 4
    f32.store offset=4
    local.get 0
    local.get 3
    f32.store
    i32.const 0)
  (func $vec3_random (type 4) (param i32) (result i32)
    (local i32)
    i32.const 0
    i32.const 0
    i32.load offset=1049692
    local.tee 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.store offset=1049692
    local.get 0
    local.get 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store
    local.get 0
    i32.const 0
    i32.load offset=1049692
    local.tee 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=4
    i32.const 0
    local.get 1
    i32.const 13
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.const 17
    i32.shr_u
    local.get 1
    i32.xor
    local.tee 1
    i32.const 5
    i32.shl
    local.get 1
    i32.xor
    local.tee 1
    i32.store offset=1049692
    local.get 0
    local.get 1
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.store offset=8
    i32.const 0)
  (func $vec3_random_range (type 9) (param i32 f32 f32) (result i32)
    (local i32)
    i32.const 0
    i32.const 0
    i32.load offset=1049692
    local.tee 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.store offset=1049692
    local.get 0
    local.get 1
    local.get 2
    local.get 1
    f32.sub
    local.tee 2
    local.get 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store
    local.get 0
    local.get 1
    local.get 2
    i32.const 0
    i32.load offset=1049692
    local.tee 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=4
    i32.const 0
    local.get 3
    i32.const 13
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.const 17
    i32.shr_u
    local.get 3
    i32.xor
    local.tee 3
    i32.const 5
    i32.shl
    local.get 3
    i32.xor
    local.tee 3
    i32.store offset=1049692
    local.get 0
    local.get 1
    local.get 2
    local.get 3
    f32.convert_i32_u
    f32.const 0x1p-32 (;=2.32831e-10;)
    f32.mul
    f32.mul
    f32.add
    f32.store offset=8
    i32.const 0)
  (func $vec3_reflect (type 1) (param i32 i32 i32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32)
    f32.const 0x0p+0 (;=0;)
    local.set 3
    f32.const 0x0p+0 (;=0;)
    local.set 4
    f32.const 0x0p+0 (;=0;)
    local.set 5
    block  ;; label = @1
      local.get 2
      f32.load
      local.tee 6
      local.get 6
      f32.mul
      local.get 2
      f32.load offset=4
      local.tee 7
      local.get 7
      f32.mul
      f32.add
      local.get 2
      f32.load offset=8
      local.tee 8
      local.get 8
      f32.mul
      f32.add
      local.tee 9
      f32.const 0x0p+0 (;=0;)
      f32.eq
      br_if 0 (;@1;)
      local.get 8
      local.get 9
      f32.sqrt
      local.tee 3
      f32.div
      local.set 5
      local.get 7
      local.get 3
      f32.div
      local.set 4
      local.get 6
      local.get 3
      f32.div
      local.set 3
    end
    local.get 0
    local.get 1
    f32.load offset=8
    local.tee 6
    local.get 5
    local.get 3
    local.get 1
    f32.load
    local.tee 7
    f32.mul
    local.get 4
    local.get 1
    f32.load offset=4
    local.tee 8
    f32.mul
    f32.add
    local.get 5
    local.get 6
    f32.mul
    f32.add
    local.tee 6
    local.get 6
    f32.add
    local.tee 6
    f32.mul
    f32.sub
    f32.store offset=8
    local.get 0
    local.get 8
    local.get 4
    local.get 6
    f32.mul
    f32.sub
    f32.store offset=4
    local.get 0
    local.get 7
    local.get 3
    local.get 6
    f32.mul
    f32.sub
    f32.store
    i32.const 0)
  (func $vec3_refract (type 12) (param i32 i32 i32 f32) (result i32)
    (local f32 f32 f32 f32 f32 f32 f32)
    f32.const 0x0p+0 (;=0;)
    local.set 4
    block  ;; label = @1
      local.get 3
      f32.const 0x0p+0 (;=0;)
      f32.le
      br_if 0 (;@1;)
      f32.const 0x0p+0 (;=0;)
      local.set 5
      f32.const 0x0p+0 (;=0;)
      local.set 6
      block  ;; label = @2
        local.get 2
        f32.load
        local.tee 7
        local.get 7
        f32.mul
        local.get 2
        f32.load offset=4
        local.tee 8
        local.get 8
        f32.mul
        f32.add
        local.get 2
        f32.load offset=8
        local.tee 9
        local.get 9
        f32.mul
        f32.add
        local.tee 10
        f32.const 0x0p+0 (;=0;)
        f32.eq
        br_if 0 (;@2;)
        local.get 9
        local.get 10
        f32.sqrt
        local.tee 4
        f32.div
        local.set 6
        local.get 8
        local.get 4
        f32.div
        local.set 5
        local.get 7
        local.get 4
        f32.div
        local.set 4
      end
      local.get 0
      local.get 3
      local.get 1
      f32.load offset=8
      local.tee 7
      local.get 6
      local.get 4
      local.get 1
      f32.load
      local.tee 9
      f32.mul
      local.get 5
      local.get 1
      f32.load offset=4
      local.tee 10
      f32.mul
      f32.add
      local.get 6
      local.get 7
      f32.mul
      f32.add
      local.tee 7
      f32.mul
      f32.sub
      f32.mul
      local.get 6
      f32.const 0x1p+0 (;=1;)
      local.get 3
      local.get 3
      f32.mul
      f32.const 0x1p+0 (;=1;)
      local.get 7
      local.get 7
      f32.mul
      f32.sub
      f32.mul
      f32.sub
      f32.sqrt
      local.tee 8
      f32.mul
      f32.sub
      f32.store offset=8
      local.get 0
      local.get 3
      local.get 10
      local.get 5
      local.get 7
      f32.mul
      f32.sub
      f32.mul
      local.get 5
      local.get 8
      f32.mul
      f32.sub
      f32.store offset=4
      local.get 0
      local.get 3
      local.get 9
      local.get 4
      local.get 7
      f32.mul
      f32.sub
      f32.mul
      local.get 4
      local.get 8
      f32.mul
      f32.sub
      f32.store
      i32.const 0
      return
    end
    local.get 0
    i32.const 0
    i32.store offset=8
    local.get 0
    i64.const 0
    i64.store align=4
    i32.const 0)
  (func $vec3_round (type 0) (param i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    f32.const 0x1p-1 (;=0.5;)
    f32.add
    f32.floor
    f32.store offset=8
    i32.const 0)
  (func $vec3_scl (type 10) (param i32 i32 f32) (result i32)
    local.get 0
    local.get 2
    local.get 1
    f32.load
    f32.mul
    f32.store
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=4
    f32.mul
    f32.store offset=4
    local.get 0
    local.get 2
    local.get 1
    f32.load offset=8
    f32.mul
    f32.store offset=8
    i32.const 0)
  (func $vec3_sub (type 1) (param i32 i32 i32) (result i32)
    local.get 0
    local.get 1
    f32.load
    local.get 2
    f32.load
    f32.sub
    f32.store
    local.get 0
    local.get 1
    f32.load offset=4
    local.get 2
    f32.load offset=4
    f32.sub
    f32.store offset=4
    local.get 0
    local.get 1
    f32.load offset=8
    local.get 2
    f32.load offset=8
    f32.sub
    f32.store offset=8
    i32.const 0)
  (func $wasmgpu_alloc (type 4) (param i32) (result i32)
    (local i32 i32 i32)
    i32.const 0
    local.set 1
    block  ;; label = @1
      i32.const 0
      i32.load offset=1049688
      local.tee 2
      i32.const -1
      i32.ne
      br_if 0 (;@1;)
      i32.const 1049728
      local.set 2
      i32.const 0
      i32.const 1049728
      i32.store offset=1049688
    end
    block  ;; label = @1
      local.get 2
      i32.const 7
      i32.add
      i32.const -8
      i32.and
      local.tee 3
      local.get 0
      i32.add
      local.tee 2
      local.get 3
      i32.lt_u
      br_if 0 (;@1;)
      block  ;; label = @2
        local.get 2
        memory.size
        i32.const 16
        i32.shl
        local.tee 0
        i32.le_u
        br_if 0 (;@2;)
        local.get 2
        local.get 0
        i32.sub
        i32.const 65535
        i32.add
        i32.const 16
        i32.shr_u
        memory.grow
        i32.const -1
        i32.eq
        br_if 1 (;@1;)
      end
      i32.const 0
      local.get 2
      i32.store offset=1049688
      local.get 3
      local.set 1
    end
    local.get 1)
  (func $wasmgpu_alloc_f32 (type 4) (param i32) (result i32)
    (local i32 i32 i32)
    local.get 0
    i32.const 2
    i32.shl
    local.set 1
    i32.const 0
    local.set 2
    block  ;; label = @1
      i32.const 0
      i32.load offset=1049688
      local.tee 0
      i32.const -1
      i32.ne
      br_if 0 (;@1;)
      i32.const 1049728
      local.set 0
      i32.const 0
      i32.const 1049728
      i32.store offset=1049688
    end
    block  ;; label = @1
      local.get 0
      i32.const 3
      i32.add
      i32.const -4
      i32.and
      local.tee 3
      local.get 1
      i32.add
      local.tee 0
      local.get 3
      i32.lt_u
      br_if 0 (;@1;)
      block  ;; label = @2
        local.get 0
        memory.size
        i32.const 16
        i32.shl
        local.tee 1
        i32.le_u
        br_if 0 (;@2;)
        local.get 0
        local.get 1
        i32.sub
        i32.const 65535
        i32.add
        i32.const 16
        i32.shr_u
        memory.grow
        i32.const -1
        i32.eq
        br_if 1 (;@1;)
      end
      i32.const 0
      local.get 0
      i32.store offset=1049688
      local.get 3
      local.set 2
    end
    local.get 2)
  (func $wasmgpu_frame_alloc (type 0) (param i32 i32) (result i32)
    (local i32 i32 i32)
    i32.const 0
    local.set 2
    block  ;; label = @1
      i32.const 0
      i32.load offset=1049700
      local.tee 3
      i32.eqz
      br_if 0 (;@1;)
      i32.const 0
      i32.load offset=1049696
      local.tee 4
      i32.eqz
      br_if 0 (;@1;)
      local.get 1
      i32.popcnt
      i32.const 1
      i32.ne
      br_if 0 (;@1;)
      i32.const 0
      local.set 2
      local.get 1
      local.get 3
      i32.add
      i32.const 0
      i32.load offset=1049704
      i32.add
      i32.const -1
      i32.add
      i32.const 0
      local.get 1
      i32.sub
      i32.and
      local.tee 1
      local.get 0
      i32.add
      local.tee 0
      local.get 1
      i32.lt_u
      br_if 0 (;@1;)
      local.get 0
      local.get 3
      i32.sub
      local.tee 3
      local.get 4
      i32.gt_u
      br_if 0 (;@1;)
      i32.const 0
      local.get 3
      i32.store offset=1049704
      local.get 1
      local.set 2
    end
    local.get 2)
  (func $wasmgpu_frame_alloc_f32 (type 4) (param i32) (result i32)
    (local i32 i32 i32 i32)
    i32.const 0
    local.set 1
    block  ;; label = @1
      local.get 0
      i32.const 1073741823
      i32.gt_u
      br_if 0 (;@1;)
      i32.const 0
      i32.load offset=1049700
      local.tee 2
      i32.eqz
      br_if 0 (;@1;)
      i32.const 0
      i32.load offset=1049696
      local.tee 3
      i32.eqz
      br_if 0 (;@1;)
      i32.const 0
      local.set 1
      local.get 2
      i32.const 0
      i32.load offset=1049704
      i32.add
      i32.const 15
      i32.add
      i32.const -16
      i32.and
      local.tee 4
      local.get 0
      i32.const 2
      i32.shl
      i32.add
      local.tee 0
      local.get 4
      i32.lt_u
      br_if 0 (;@1;)
      local.get 0
      local.get 2
      i32.sub
      local.tee 0
      local.get 3
      i32.gt_u
      br_if 0 (;@1;)
      i32.const 0
      local.get 0
      i32.store offset=1049704
      local.get 4
      local.set 1
    end
    local.get 1)
  (func $wasmgpu_frame_arena_cap (type 17) (result i32)
    i32.const 0
    i32.load offset=1049696)
  (func $wasmgpu_frame_arena_init (type 4) (param i32) (result i32)
    (local i32 i32 i32 i32)
    block  ;; label = @1
      i32.const 0
      i32.load offset=1049700
      local.tee 1
      br_if 0 (;@1;)
      i32.const 0
      local.set 1
      local.get 0
      i32.eqz
      br_if 0 (;@1;)
      i32.const 0
      local.set 1
      block  ;; label = @2
        i32.const 0
        i32.load offset=1049688
        local.tee 2
        i32.const -1
        i32.ne
        br_if 0 (;@2;)
        i32.const 1049728
        local.set 2
        i32.const 0
        i32.const 1049728
        i32.store offset=1049688
      end
      local.get 2
      i32.const 15
      i32.add
      i32.const -16
      i32.and
      local.tee 2
      local.get 0
      i32.add
      local.tee 3
      local.get 2
      i32.lt_u
      br_if 0 (;@1;)
      block  ;; label = @2
        local.get 3
        memory.size
        i32.const 16
        i32.shl
        local.tee 4
        i32.le_u
        br_if 0 (;@2;)
        local.get 3
        local.get 4
        i32.sub
        i32.const 65535
        i32.add
        i32.const 16
        i32.shr_u
        memory.grow
        i32.const -1
        i32.eq
        br_if 1 (;@1;)
      end
      i32.const 0
      local.set 1
      i32.const 0
      local.get 3
      i32.store offset=1049688
      local.get 2
      i32.eqz
      br_if 0 (;@1;)
      i32.const 0
      local.get 0
      i32.store offset=1049696
      i32.const 0
      local.get 2
      i32.store offset=1049700
      i32.const 0
      i32.const 0
      i32.store offset=1049704
      local.get 2
      local.set 1
    end
    local.get 1)
  (func $wasmgpu_frame_arena_reset (type 18)
    i32.const 0
    i32.const 0
    i32.store offset=1049704)
  (func $wasmgpu_frame_arena_used (type 17) (result i32)
    i32.const 0
    i32.load offset=1049704)
  (func $wasmgpu_free (type 2) (param i32 i32))
  (func $wasmgpu_seed (type 8) (param i32)
    i32.const 0
    local.get 0
    i32.const 305419896
    local.get 0
    select
    i32.store offset=1049692)
  (func $_ZN4core3fmt9Formatter12pad_integral12write_prefix17hccdc72e316ba0407E (type 6) (param i32 i32 i32 i32) (result i32)
    block  ;; label = @1
      local.get 2
      i32.const 1114112
      i32.eq
      br_if 0 (;@1;)
      local.get 0
      local.get 2
      local.get 1
      i32.load offset=16
      call_indirect (type 0)
      i32.eqz
      br_if 0 (;@1;)
      i32.const 1
      return
    end
    block  ;; label = @1
      local.get 3
      br_if 0 (;@1;)
      i32.const 0
      return
    end
    local.get 0
    local.get 3
    i32.const 0
    local.get 1
    i32.load offset=12
    call_indirect (type 1))
  (func $_ZN4core3fmt3num3imp54_$LT$impl$u20$core..fmt..Display$u20$for$u20$usize$GT$3fmt17hfcc4f6d8bf65995eE (type 0) (param i32 i32) (result i32)
    (local i32 i32 i32 i32 i32 i32 i32 i32 i32 i32 i64)
    global.get $__stack_pointer
    i32.const 16
    i32.sub
    local.tee 2
    global.set $__stack_pointer
    block  ;; label = @1
      block  ;; label = @2
        local.get 0
        i32.load
        local.tee 3
        i32.const 999
        i32.gt_u
        br_if 0 (;@2;)
        i32.const 10
        local.set 0
        local.get 3
        local.set 4
        br 1 (;@1;)
      end
      local.get 2
      local.get 3
      local.get 3
      i32.const 10000
      i32.div_u
      local.tee 4
      i32.const 10000
      i32.mul
      i32.sub
      local.tee 0
      i32.const 65535
      i32.and
      i32.const 100
      i32.div_u
      local.tee 5
      i32.const 1
      i32.shl
      i32.load16_u offset=1049144 align=1
      i32.store16 offset=12 align=1
      local.get 2
      local.get 0
      local.get 5
      i32.const 100
      i32.mul
      i32.sub
      i32.const 65535
      i32.and
      i32.const 1
      i32.shl
      i32.load16_u offset=1049144 align=1
      i32.store16 offset=14 align=1
      block  ;; label = @2
        local.get 3
        i32.const 9999999
        i32.gt_u
        br_if 0 (;@2;)
        i32.const 6
        local.set 0
        br 1 (;@1;)
      end
      local.get 2
      local.get 4
      i32.const 10000
      i32.rem_u
      local.tee 0
      i32.const 100
      i32.div_u
      local.tee 4
      i32.const 1
      i32.shl
      i32.load16_u offset=1049144 align=1
      i32.store16 offset=8 align=1
      local.get 2
      local.get 0
      local.get 4
      i32.const 100
      i32.mul
      i32.sub
      i32.const 65535
      i32.and
      i32.const 1
      i32.shl
      i32.load16_u offset=1049144 align=1
      i32.store16 offset=10 align=1
      local.get 3
      i32.const 100000000
      i32.div_u
      local.set 4
      i32.const 2
      local.set 0
    end
    block  ;; label = @1
      block  ;; label = @2
        local.get 4
        i32.const 9
        i32.gt_u
        br_if 0 (;@2;)
        local.get 4
        local.set 5
        br 1 (;@1;)
      end
      local.get 2
      i32.const 6
      i32.add
      local.get 0
      i32.const -2
      i32.add
      local.tee 0
      i32.add
      local.get 4
      local.get 4
      i32.const 65535
      i32.and
      i32.const 100
      i32.div_u
      local.tee 5
      i32.const 100
      i32.mul
      i32.sub
      i32.const 65535
      i32.and
      i32.const 1
      i32.shl
      i32.load16_u offset=1049144 align=1
      i32.store16 align=1
    end
    block  ;; label = @1
      block  ;; label = @2
        local.get 3
        i32.eqz
        br_if 0 (;@2;)
        local.get 5
        i32.eqz
        br_if 1 (;@1;)
      end
      local.get 2
      i32.const 6
      i32.add
      local.get 0
      i32.const -1
      i32.add
      local.tee 0
      i32.add
      local.get 5
      i32.const 1
      i32.shl
      i32.load8_u offset=1049145
      i32.store8
    end
    i32.const 43
    i32.const 1114112
    local.get 1
    i32.load offset=8
    local.tee 3
    i32.const 2097152
    i32.and
    local.tee 4
    select
    local.set 6
    local.get 3
    i32.const 8388608
    i32.and
    i32.const 23
    i32.shr_u
    local.set 7
    local.get 2
    i32.const 6
    i32.add
    local.get 0
    i32.add
    local.set 8
    block  ;; label = @1
      block  ;; label = @2
        local.get 4
        i32.const 21
        i32.shr_u
        i32.const 10
        local.get 0
        i32.sub
        local.tee 9
        i32.add
        local.tee 10
        local.get 1
        i32.load16_u offset=12
        local.tee 11
        i32.ge_u
        br_if 0 (;@2;)
        block  ;; label = @3
          block  ;; label = @4
            block  ;; label = @5
              local.get 3
              i32.const 16777216
              i32.and
              br_if 0 (;@5;)
              local.get 11
              local.get 10
              i32.sub
              local.set 11
              i32.const 0
              local.set 0
              i32.const 0
              local.set 10
              block  ;; label = @6
                block  ;; label = @7
                  block  ;; label = @8
                    local.get 3
                    i32.const 29
                    i32.shr_u
                    i32.const 3
                    i32.and
                    br_table 2 (;@6;) 0 (;@8;) 1 (;@7;) 0 (;@8;) 2 (;@6;)
                  end
                  local.get 11
                  local.set 10
                  br 1 (;@6;)
                end
                local.get 11
                i32.const 65534
                i32.and
                i32.const 1
                i32.shr_u
                local.set 10
              end
              local.get 3
              i32.const 2097151
              i32.and
              local.set 5
              local.get 1
              i32.load offset=4
              local.set 4
              local.get 1
              i32.load
              local.set 1
              loop  ;; label = @6
                local.get 0
                i32.const 65535
                i32.and
                local.get 10
                i32.const 65535
                i32.and
                i32.ge_u
                br_if 2 (;@4;)
                i32.const 1
                local.set 3
                local.get 0
                i32.const 1
                i32.add
                local.set 0
                local.get 1
                local.get 5
                local.get 4
                i32.load offset=16
                call_indirect (type 0)
                i32.eqz
                br_if 0 (;@6;)
                br 5 (;@1;)
              end
            end
            local.get 1
            local.get 1
            i64.load offset=8 align=4
            local.tee 12
            i32.wrap_i64
            i32.const -1612709888
            i32.and
            i32.const 536870960
            i32.or
            i32.store offset=8
            i32.const 1
            local.set 3
            local.get 1
            i32.load
            local.tee 4
            local.get 1
            i32.load offset=4
            local.tee 5
            local.get 6
            local.get 7
            call $_ZN4core3fmt9Formatter12pad_integral12write_prefix17hccdc72e316ba0407E
            br_if 3 (;@1;)
            i32.const 0
            local.set 0
            local.get 11
            local.get 10
            i32.sub
            i32.const 65535
            i32.and
            local.set 10
            loop  ;; label = @5
              local.get 0
              i32.const 65535
              i32.and
              local.get 10
              i32.ge_u
              br_if 2 (;@3;)
              i32.const 1
              local.set 3
              local.get 0
              i32.const 1
              i32.add
              local.set 0
              local.get 4
              i32.const 48
              local.get 5
              i32.load offset=16
              call_indirect (type 0)
              i32.eqz
              br_if 0 (;@5;)
              br 4 (;@1;)
            end
          end
          i32.const 1
          local.set 3
          local.get 1
          local.get 4
          local.get 6
          local.get 7
          call $_ZN4core3fmt9Formatter12pad_integral12write_prefix17hccdc72e316ba0407E
          br_if 2 (;@1;)
          local.get 1
          local.get 8
          local.get 9
          local.get 4
          i32.load offset=12
          call_indirect (type 1)
          br_if 2 (;@1;)
          local.get 11
          local.get 10
          i32.sub
          i32.const 65535
          i32.and
          local.set 10
          i32.const 0
          local.set 0
          loop  ;; label = @4
            block  ;; label = @5
              local.get 0
              i32.const 65535
              i32.and
              local.get 10
              i32.lt_u
              br_if 0 (;@5;)
              i32.const 0
              local.set 3
              br 4 (;@1;)
            end
            i32.const 1
            local.set 3
            local.get 0
            i32.const 1
            i32.add
            local.set 0
            local.get 1
            local.get 5
            local.get 4
            i32.load offset=16
            call_indirect (type 0)
            i32.eqz
            br_if 0 (;@4;)
            br 3 (;@1;)
          end
        end
        i32.const 1
        local.set 3
        local.get 4
        local.get 8
        local.get 9
        local.get 5
        i32.load offset=12
        call_indirect (type 1)
        br_if 1 (;@1;)
        local.get 1
        local.get 12
        i64.store offset=8 align=4
        i32.const 0
        local.set 3
        br 1 (;@1;)
      end
      i32.const 1
      local.set 3
      local.get 1
      i32.load
      local.tee 0
      local.get 1
      i32.load offset=4
      local.tee 1
      local.get 6
      local.get 7
      call $_ZN4core3fmt9Formatter12pad_integral12write_prefix17hccdc72e316ba0407E
      br_if 0 (;@1;)
      local.get 0
      local.get 8
      local.get 9
      local.get 1
      i32.load offset=12
      call_indirect (type 1)
      local.set 3
    end
    local.get 2
    i32.const 16
    i32.add
    global.set $__stack_pointer
    local.get 3)
  (func $_ZN4core9panicking9panic_fmt17ha9276d4d9f74c64eE (type 14) (param i32 i32 i32)
    (local i32)
    global.get $__stack_pointer
    i32.const 32
    i32.sub
    local.tee 3
    global.set $__stack_pointer
    local.get 3
    local.get 1
    i32.store offset=16
    local.get 3
    local.get 0
    i32.store offset=12
    local.get 3
    i32.const 1
    i32.store16 offset=28
    local.get 3
    local.get 2
    i32.store offset=24
    local.get 3
    local.get 3
    i32.const 12
    i32.add
    i32.store offset=20
    local.get 3
    i32.const 20
    i32.add
    call $_RNvCshXwFllX56pT_7___rustc17rust_begin_unwind
    unreachable)
  (func $_RNvCshXwFllX56pT_7___rustc17rust_begin_unwind (type 8) (param i32)
    (local i32 i64)
    global.get $__stack_pointer
    i32.const 16
    i32.sub
    local.tee 1
    global.set $__stack_pointer
    local.get 0
    i64.load align=4
    local.set 2
    local.get 1
    local.get 0
    i32.store offset=12
    local.get 1
    local.get 2
    i64.store offset=4 align=4
    local.get 1
    i32.const 4
    i32.add
    call $_ZN3std3sys9backtrace26__rust_end_short_backtrace17he893bb92b16d0829E
    unreachable)
  (func $_ZN4core5panic12PanicPayload6as_str17h1af804a37c6a66baE (type 2) (param i32 i32)
    local.get 0
    i32.const 0
    i32.store)
  (func $_ZN3std9panicking15panic_with_hook17hdd610f6c18026bcbE (type 19) (param i32 i32 i32 i32)
    (local i32 i32)
    global.get $__stack_pointer
    i32.const 16
    i32.sub
    local.tee 4
    global.set $__stack_pointer
    i32.const 0
    i32.const 0
    i32.load offset=1049716
    local.tee 5
    i32.const 1
    i32.add
    i32.store offset=1049716
    block  ;; label = @1
      local.get 5
      i32.const 0
      i32.lt_s
      br_if 0 (;@1;)
      block  ;; label = @2
        block  ;; label = @3
          i32.const 0
          i32.load8_u offset=1049712
          br_if 0 (;@3;)
          i32.const 0
          i32.const 0
          i32.load offset=1049708
          i32.const 1
          i32.add
          i32.store offset=1049708
          i32.const 0
          i32.load offset=1049720
          i32.const -1
          i32.gt_s
          br_if 1 (;@2;)
          br 2 (;@1;)
        end
        local.get 4
        i32.const 8
        i32.add
        local.get 0
        local.get 1
        call_indirect (type 2)
        unreachable
      end
      i32.const 0
      i32.const 0
      i32.store8 offset=1049712
      local.get 2
      i32.eqz
      br_if 0 (;@1;)
      call $_RNvCshXwFllX56pT_7___rustc10rust_panic
      unreachable
    end
    unreachable)
  (func $_RNvCshXwFllX56pT_7___rustc10rust_panic (type 18)
    unreachable)
  (func $_ZN3std3sys9backtrace26__rust_end_short_backtrace17he893bb92b16d0829E (type 8) (param i32)
    local.get 0
    call $_ZN3std9panicking13panic_handler28_$u7b$$u7b$closure$u7d$$u7d$17ha276f0fd86b6d853E
    unreachable)
  (func $_ZN3std9panicking13panic_handler28_$u7b$$u7b$closure$u7d$$u7d$17ha276f0fd86b6d853E (type 8) (param i32)
    (local i32 i32 i32)
    global.get $__stack_pointer
    i32.const 16
    i32.sub
    local.tee 1
    global.set $__stack_pointer
    block  ;; label = @1
      local.get 0
      i32.load
      local.tee 2
      i32.load offset=4
      local.tee 3
      i32.const 1
      i32.and
      br_if 0 (;@1;)
      local.get 1
      i32.const -2147483648
      i32.store
      local.get 1
      local.get 0
      i32.store offset=12
      local.get 1
      i32.const 2
      local.get 0
      i32.load offset=8
      local.tee 0
      i32.load8_u offset=8
      local.get 0
      i32.load8_u offset=9
      call $_ZN3std9panicking15panic_with_hook17hdd610f6c18026bcbE
      unreachable
    end
    local.get 2
    i32.load
    local.set 2
    local.get 1
    local.get 3
    i32.const 1
    i32.shr_u
    i32.store offset=4
    local.get 1
    local.get 2
    i32.store
    local.get 1
    i32.const 3
    local.get 0
    i32.load offset=8
    local.tee 0
    i32.load8_u offset=8
    local.get 0
    i32.load8_u offset=9
    call $_ZN3std9panicking15panic_with_hook17hdd610f6c18026bcbE
    unreachable)
  (func $_ZN93_$LT$std..panicking..panic_handler..StaticStrPayload$u20$as$u20$core..panic..PanicPayload$GT$6as_str17hc028f8efa205acb2E (type 2) (param i32 i32)
    local.get 0
    local.get 1
    i64.load align=4
    i64.store)
  (func $_ZN17compiler_builtins4math9libm_math14rem_pio2_large14rem_pio2_large17h87b9bb9d7be612b6E (type 20) (param i32 i32 i32 i32 i32 i32) (result i32)
    (local i32 i32 i32 i32 i32 i32 i32 f64 i32 i32 i32 i32 i32 i32 i32 i32 f64 i32 i32 i32 i32 i32 i32 i32 f64 i32 i32 i32 i32 i32 f64)
    global.get $__stack_pointer
    i32.const 560
    i32.sub
    local.tee 6
    global.set $__stack_pointer
    local.get 6
    i64.const 0
    i64.store offset=152
    local.get 6
    i64.const 0
    i64.store offset=144
    local.get 6
    i64.const 0
    i64.store offset=136
    local.get 6
    i64.const 0
    i64.store offset=128
    local.get 6
    i64.const 0
    i64.store offset=120
    local.get 6
    i64.const 0
    i64.store offset=112
    local.get 6
    i64.const 0
    i64.store offset=104
    local.get 6
    i64.const 0
    i64.store offset=96
    local.get 6
    i64.const 0
    i64.store offset=88
    local.get 6
    i64.const 0
    i64.store offset=80
    local.get 6
    i64.const 0
    i64.store offset=72
    local.get 6
    i64.const 0
    i64.store offset=64
    local.get 6
    i64.const 0
    i64.store offset=56
    local.get 6
    i64.const 0
    i64.store offset=48
    local.get 6
    i64.const 0
    i64.store offset=40
    local.get 6
    i64.const 0
    i64.store offset=32
    local.get 6
    i64.const 0
    i64.store offset=24
    local.get 6
    i64.const 0
    i64.store offset=16
    local.get 6
    i64.const 0
    i64.store offset=8
    local.get 6
    i64.const 0
    i64.store
    local.get 6
    i64.const 0
    i64.store offset=312
    local.get 6
    i64.const 0
    i64.store offset=304
    local.get 6
    i64.const 0
    i64.store offset=296
    local.get 6
    i64.const 0
    i64.store offset=288
    local.get 6
    i64.const 0
    i64.store offset=280
    local.get 6
    i64.const 0
    i64.store offset=272
    local.get 6
    i64.const 0
    i64.store offset=264
    local.get 6
    i64.const 0
    i64.store offset=256
    local.get 6
    i64.const 0
    i64.store offset=248
    local.get 6
    i64.const 0
    i64.store offset=240
    local.get 6
    i64.const 0
    i64.store offset=232
    local.get 6
    i64.const 0
    i64.store offset=224
    local.get 6
    i64.const 0
    i64.store offset=216
    local.get 6
    i64.const 0
    i64.store offset=208
    local.get 6
    i64.const 0
    i64.store offset=200
    local.get 6
    i64.const 0
    i64.store offset=192
    local.get 6
    i64.const 0
    i64.store offset=184
    local.get 6
    i64.const 0
    i64.store offset=176
    local.get 6
    i64.const 0
    i64.store offset=168
    local.get 6
    i64.const 0
    i64.store offset=160
    local.get 6
    i64.const 0
    i64.store offset=472
    local.get 6
    i64.const 0
    i64.store offset=464
    local.get 6
    i64.const 0
    i64.store offset=456
    local.get 6
    i64.const 0
    i64.store offset=448
    local.get 6
    i64.const 0
    i64.store offset=440
    local.get 6
    i64.const 0
    i64.store offset=432
    local.get 6
    i64.const 0
    i64.store offset=424
    local.get 6
    i64.const 0
    i64.store offset=416
    local.get 6
    i64.const 0
    i64.store offset=408
    local.get 6
    i64.const 0
    i64.store offset=400
    local.get 6
    i64.const 0
    i64.store offset=392
    local.get 6
    i64.const 0
    i64.store offset=384
    local.get 6
    i64.const 0
    i64.store offset=376
    local.get 6
    i64.const 0
    i64.store offset=368
    local.get 6
    i64.const 0
    i64.store offset=360
    local.get 6
    i64.const 0
    i64.store offset=352
    local.get 6
    i64.const 0
    i64.store offset=344
    local.get 6
    i64.const 0
    i64.store offset=336
    local.get 6
    i64.const 0
    i64.store offset=328
    local.get 6
    i64.const 0
    i64.store offset=320
    block  ;; label = @1
      i32.const 80
      i32.eqz
      br_if 0 (;@1;)
      local.get 6
      i32.const 480
      i32.add
      i32.const 0
      i32.const 80
      memory.fill
    end
    local.get 5
    i32.const 2
    i32.shl
    i32.load offset=1049344
    local.tee 7
    local.get 1
    i32.const -1
    i32.add
    local.tee 8
    i32.add
    local.set 9
    local.get 4
    i32.const -3
    i32.add
    i32.const 24
    i32.div_s
    local.tee 10
    i32.const 0
    local.get 10
    i32.const 0
    i32.gt_s
    select
    local.tee 11
    local.get 8
    i32.sub
    local.set 10
    local.get 11
    i32.const 2
    i32.shl
    local.get 1
    i32.const 2
    i32.shl
    i32.sub
    i32.const 1049428
    i32.add
    local.set 12
    i32.const 0
    local.set 1
    loop  ;; label = @1
      block  ;; label = @2
        block  ;; label = @3
          local.get 10
          i32.const 0
          i32.ge_s
          br_if 0 (;@3;)
          f64.const 0x0p+0 (;=0;)
          local.set 13
          br 1 (;@2;)
        end
        local.get 12
        i32.load
        f64.convert_i32_s
        local.set 13
      end
      local.get 6
      local.get 1
      i32.const 3
      i32.shl
      i32.add
      local.get 13
      f64.store
      block  ;; label = @2
        local.get 1
        local.get 9
        i32.ge_u
        br_if 0 (;@2;)
        local.get 12
        i32.const 4
        i32.add
        local.set 12
        local.get 10
        i32.const 1
        i32.add
        local.set 10
        local.get 1
        local.get 1
        local.get 9
        i32.lt_u
        i32.add
        local.tee 1
        local.get 9
        i32.le_u
        br_if 1 (;@1;)
      end
    end
    i32.const 0
    local.set 10
    loop  ;; label = @1
      local.get 10
      local.get 8
      i32.add
      local.set 9
      f64.const 0x0p+0 (;=0;)
      local.set 13
      i32.const 0
      local.set 1
      block  ;; label = @2
        loop  ;; label = @3
          local.get 13
          local.get 0
          local.get 1
          i32.const 3
          i32.shl
          i32.add
          f64.load
          local.get 6
          local.get 9
          local.get 1
          i32.sub
          i32.const 3
          i32.shl
          i32.add
          f64.load
          f64.mul
          f64.add
          local.set 13
          local.get 1
          local.get 8
          i32.ge_u
          br_if 1 (;@2;)
          local.get 1
          local.get 1
          local.get 8
          i32.lt_u
          i32.add
          local.tee 1
          local.get 8
          i32.le_u
          br_if 0 (;@3;)
        end
      end
      local.get 6
      i32.const 320
      i32.add
      local.get 10
      i32.const 3
      i32.shl
      i32.add
      local.get 13
      f64.store
      block  ;; label = @2
        local.get 10
        local.get 7
        i32.ge_u
        br_if 0 (;@2;)
        local.get 10
        local.get 10
        local.get 7
        i32.lt_u
        i32.add
        local.tee 10
        local.get 7
        i32.le_u
        br_if 1 (;@1;)
      end
    end
    f64.const inf (;=inf;)
    f64.const 0x1p+1023 (;=8.98847e+307;)
    local.get 4
    local.get 11
    i32.const -24
    i32.mul
    i32.add
    local.tee 14
    i32.const -24
    i32.add
    local.tee 15
    i32.const 2046
    i32.gt_u
    local.tee 16
    select
    f64.const 0x0p+0 (;=0;)
    f64.const 0x1p-969 (;=2.00417e-292;)
    local.get 15
    i32.const -1991
    i32.lt_u
    local.tee 17
    select
    f64.const 0x1p+0 (;=1;)
    local.get 15
    i32.const -1022
    i32.lt_s
    local.tee 18
    select
    local.get 15
    i32.const 1023
    i32.gt_s
    local.tee 19
    select
    local.get 15
    i32.const 3069
    local.get 15
    i32.const 3069
    i32.lt_u
    select
    i32.const -2046
    i32.add
    local.get 14
    i32.const -1047
    i32.add
    local.get 16
    select
    local.tee 20
    local.get 15
    i32.const -2960
    local.get 15
    i32.const -2960
    i32.gt_u
    select
    i32.const 1938
    i32.add
    local.get 14
    i32.const 945
    i32.add
    local.get 17
    select
    local.tee 21
    local.get 15
    local.get 18
    select
    local.get 19
    select
    i32.const 1023
    i32.add
    i64.extend_i32_u
    i64.const 52
    i64.shl
    f64.reinterpret_i64
    f64.mul
    local.set 22
    local.get 6
    i32.const 480
    i32.add
    i32.const -4
    i32.add
    local.tee 23
    local.get 7
    i32.const 2
    i32.shl
    i32.add
    local.set 24
    i32.const 47
    local.get 14
    i32.sub
    i32.const 31
    i32.and
    local.set 25
    i32.const 48
    local.get 14
    i32.sub
    i32.const 31
    i32.and
    local.set 26
    local.get 6
    i32.const 312
    i32.add
    local.set 4
    local.get 15
    i32.const 0
    i32.gt_s
    local.set 27
    local.get 15
    i32.const -1
    i32.add
    local.set 28
    local.get 7
    local.set 10
    block  ;; label = @1
      block  ;; label = @2
        loop  ;; label = @3
          local.get 6
          i32.const 320
          i32.add
          local.get 10
          local.tee 29
          i32.const 3
          i32.shl
          i32.add
          f64.load
          local.set 13
          block  ;; label = @4
            local.get 29
            i32.eqz
            br_if 0 (;@4;)
            local.get 6
            i32.const 480
            i32.add
            local.set 9
            local.get 29
            local.set 1
            loop  ;; label = @5
              local.get 9
              local.get 13
              local.get 13
              f64.const 0x1p-24 (;=5.96046e-08;)
              f64.mul
              i32.trunc_sat_f64_s
              f64.convert_i32_s
              local.tee 30
              f64.const -0x1p+24 (;=-1.67772e+07;)
              f64.mul
              f64.add
              i32.trunc_sat_f64_s
              i32.store
              local.get 4
              local.get 1
              i32.const 3
              i32.shl
              i32.add
              f64.load
              local.get 30
              f64.add
              local.set 13
              local.get 1
              i32.const 1
              i32.eq
              local.tee 10
              br_if 1 (;@4;)
              local.get 9
              i32.const 4
              i32.add
              local.set 9
              i32.const 1
              local.get 1
              i32.const -1
              i32.add
              local.get 10
              select
              local.tee 1
              br_if 0 (;@5;)
            end
          end
          block  ;; label = @4
            block  ;; label = @5
              block  ;; label = @6
                local.get 19
                br_if 0 (;@6;)
                local.get 18
                br_if 1 (;@5;)
                local.get 15
                local.set 1
                br 2 (;@4;)
              end
              local.get 13
              f64.const 0x1p+1023 (;=8.98847e+307;)
              f64.mul
              local.tee 13
              f64.const 0x1p+1023 (;=8.98847e+307;)
              f64.mul
              local.get 13
              local.get 16
              select
              local.set 13
              local.get 20
              local.set 1
              br 1 (;@4;)
            end
            local.get 13
            f64.const 0x1p-969 (;=2.00417e-292;)
            f64.mul
            local.tee 13
            f64.const 0x1p-969 (;=2.00417e-292;)
            f64.mul
            local.get 13
            local.get 17
            select
            local.set 13
            local.get 21
            local.set 1
          end
          local.get 13
          local.get 1
          i32.const 1023
          i32.add
          i64.extend_i32_u
          i64.const 52
          i64.shl
          f64.reinterpret_i64
          f64.mul
          local.tee 13
          local.get 13
          f64.const 0x1p-3 (;=0.125;)
          f64.mul
          f64.floor
          f64.const -0x1p+3 (;=-8;)
          f64.mul
          f64.add
          local.tee 13
          local.get 13
          i32.trunc_sat_f64_s
          local.tee 31
          f64.convert_i32_s
          f64.sub
          local.set 13
          block  ;; label = @4
            block  ;; label = @5
              block  ;; label = @6
                block  ;; label = @7
                  block  ;; label = @8
                    block  ;; label = @9
                      local.get 27
                      br_if 0 (;@9;)
                      block  ;; label = @10
                        local.get 15
                        i32.eqz
                        br_if 0 (;@10;)
                        i32.const 2
                        local.set 32
                        i32.const 0
                        local.set 33
                        local.get 13
                        f64.const 0x1p-1 (;=0.5;)
                        f64.ge
                        i32.eqz
                        br_if 6 (;@4;)
                        br 3 (;@7;)
                      end
                      local.get 23
                      local.get 29
                      i32.const 2
                      i32.shl
                      i32.add
                      i32.load
                      i32.const 23
                      i32.shr_s
                      local.set 32
                      br 1 (;@8;)
                    end
                    local.get 23
                    local.get 29
                    i32.const 2
                    i32.shl
                    i32.add
                    local.tee 1
                    local.get 1
                    i32.load
                    local.tee 1
                    local.get 1
                    local.get 26
                    i32.shr_s
                    local.tee 1
                    local.get 26
                    i32.shl
                    i32.sub
                    local.tee 9
                    i32.store
                    local.get 9
                    local.get 25
                    i32.shr_s
                    local.set 32
                    local.get 1
                    local.get 31
                    i32.add
                    local.set 31
                  end
                  local.get 32
                  i32.const 1
                  i32.lt_s
                  br_if 1 (;@6;)
                end
                i32.const 1
                local.set 9
                block  ;; label = @7
                  local.get 29
                  i32.eqz
                  br_if 0 (;@7;)
                  i32.const 1
                  local.set 9
                  local.get 29
                  i32.const 1
                  i32.and
                  local.set 34
                  i32.const 0
                  local.set 10
                  block  ;; label = @8
                    local.get 29
                    i32.const 1
                    i32.eq
                    br_if 0 (;@8;)
                    local.get 29
                    i32.const 30
                    i32.and
                    local.set 35
                    i32.const 0
                    local.set 12
                    local.get 6
                    i32.const 480
                    i32.add
                    local.set 1
                    i32.const 0
                    local.set 10
                    loop  ;; label = @9
                      local.get 1
                      i32.load
                      local.set 9
                      block  ;; label = @10
                        block  ;; label = @11
                          block  ;; label = @12
                            block  ;; label = @13
                              local.get 12
                              i32.eqz
                              br_if 0 (;@13;)
                              i32.const 16777215
                              local.set 12
                              br 1 (;@12;)
                            end
                            local.get 9
                            i32.eqz
                            br_if 1 (;@11;)
                            i32.const 16777216
                            local.set 12
                          end
                          local.get 1
                          local.get 12
                          local.get 9
                          i32.sub
                          i32.store
                          i32.const 0
                          local.set 12
                          br 1 (;@10;)
                        end
                        i32.const 1
                        local.set 12
                      end
                      local.get 1
                      i32.const 4
                      i32.add
                      local.tee 33
                      i32.load
                      local.set 9
                      block  ;; label = @10
                        block  ;; label = @11
                          block  ;; label = @12
                            block  ;; label = @13
                              local.get 12
                              br_if 0 (;@13;)
                              i32.const 16777215
                              local.set 12
                              br 1 (;@12;)
                            end
                            local.get 9
                            i32.eqz
                            br_if 1 (;@11;)
                            i32.const 16777216
                            local.set 12
                          end
                          local.get 33
                          local.get 12
                          local.get 9
                          i32.sub
                          i32.store
                          i32.const 1
                          local.set 12
                          i32.const 0
                          local.set 9
                          br 1 (;@10;)
                        end
                        i32.const 0
                        local.set 12
                        i32.const 1
                        local.set 9
                      end
                      local.get 1
                      i32.const 8
                      i32.add
                      local.set 1
                      local.get 35
                      local.get 10
                      i32.const 2
                      i32.add
                      local.tee 10
                      i32.ne
                      br_if 0 (;@9;)
                    end
                  end
                  local.get 34
                  i32.eqz
                  br_if 0 (;@7;)
                  local.get 6
                  i32.const 480
                  i32.add
                  local.get 10
                  i32.const 2
                  i32.shl
                  i32.add
                  local.tee 10
                  i32.load
                  local.set 1
                  block  ;; label = @8
                    block  ;; label = @9
                      block  ;; label = @10
                        local.get 9
                        br_if 0 (;@10;)
                        i32.const 16777215
                        local.set 9
                        br 1 (;@9;)
                      end
                      local.get 1
                      i32.eqz
                      br_if 1 (;@8;)
                      i32.const 16777216
                      local.set 9
                    end
                    local.get 10
                    local.get 9
                    local.get 1
                    i32.sub
                    i32.store
                    i32.const 0
                    local.set 9
                    br 1 (;@7;)
                  end
                  i32.const 1
                  local.set 9
                end
                block  ;; label = @7
                  local.get 15
                  i32.const 1
                  i32.lt_s
                  br_if 0 (;@7;)
                  i32.const 8388607
                  local.set 1
                  block  ;; label = @8
                    block  ;; label = @9
                      local.get 28
                      br_table 1 (;@8;) 0 (;@9;) 2 (;@7;)
                    end
                    i32.const 4194303
                    local.set 1
                  end
                  local.get 23
                  local.get 29
                  i32.const 2
                  i32.shl
                  i32.add
                  local.tee 10
                  local.get 10
                  i32.load
                  local.get 1
                  i32.and
                  i32.store
                end
                local.get 31
                i32.const 1
                i32.add
                local.set 31
                local.get 32
                i32.const 2
                i32.eq
                br_if 1 (;@5;)
              end
              local.get 32
              local.set 33
              br 1 (;@4;)
            end
            f64.const 0x1p+0 (;=1;)
            local.get 13
            f64.sub
            local.tee 13
            local.get 13
            local.get 22
            f64.sub
            local.get 9
            i32.const 1
            i32.and
            select
            local.set 13
            i32.const 2
            local.set 33
          end
          block  ;; label = @4
            block  ;; label = @5
              block  ;; label = @6
                block  ;; label = @7
                  local.get 13
                  f64.const 0x0p+0 (;=0;)
                  f64.ne
                  br_if 0 (;@7;)
                  local.get 24
                  local.set 1
                  local.get 29
                  local.set 10
                  local.get 7
                  local.get 29
                  i32.const -1
                  i32.add
                  local.tee 9
                  i32.gt_u
                  br_if 2 (;@5;)
                  i32.const 0
                  local.set 12
                  block  ;; label = @8
                    loop  ;; label = @9
                      local.get 6
                      i32.const 480
                      i32.add
                      local.get 9
                      i32.const 2
                      i32.shl
                      i32.add
                      i32.load
                      local.get 12
                      i32.or
                      local.set 12
                      local.get 7
                      local.get 9
                      i32.ge_u
                      br_if 1 (;@8;)
                      local.get 7
                      local.get 9
                      local.get 7
                      local.get 9
                      i32.lt_u
                      i32.sub
                      local.tee 9
                      i32.le_u
                      br_if 0 (;@9;)
                    end
                  end
                  local.get 24
                  local.set 1
                  local.get 29
                  local.set 10
                  local.get 12
                  i32.eqz
                  br_if 2 (;@5;)
                  local.get 6
                  i32.const 480
                  i32.add
                  local.get 29
                  i32.const 2
                  i32.shl
                  i32.add
                  i32.const -4
                  i32.add
                  local.set 1
                  loop  ;; label = @8
                    local.get 29
                    i32.const -1
                    i32.add
                    local.set 29
                    local.get 15
                    i32.const -24
                    i32.add
                    local.set 15
                    local.get 1
                    i32.load
                    local.set 8
                    local.get 1
                    i32.const -4
                    i32.add
                    local.set 1
                    local.get 8
                    i32.eqz
                    br_if 0 (;@8;)
                    br 2 (;@6;)
                  end
                end
                block  ;; label = @7
                  block  ;; label = @8
                    block  ;; label = @9
                      block  ;; label = @10
                        i32.const 0
                        local.get 15
                        i32.sub
                        local.tee 1
                        i32.const 1023
                        i32.gt_s
                        br_if 0 (;@10;)
                        local.get 1
                        i32.const -1022
                        i32.ge_s
                        br_if 3 (;@7;)
                        local.get 13
                        f64.const 0x1p-969 (;=2.00417e-292;)
                        f64.mul
                        local.set 13
                        local.get 1
                        i32.const -1992
                        i32.le_u
                        br_if 1 (;@9;)
                        i32.const 969
                        local.get 15
                        i32.sub
                        local.set 1
                        br 3 (;@7;)
                      end
                      local.get 13
                      f64.const 0x1p+1023 (;=8.98847e+307;)
                      f64.mul
                      local.set 13
                      local.get 1
                      i32.const 2046
                      i32.gt_u
                      br_if 1 (;@8;)
                      i32.const -1023
                      local.get 15
                      i32.sub
                      local.set 1
                      br 2 (;@7;)
                    end
                    local.get 13
                    f64.const 0x1p-969 (;=2.00417e-292;)
                    f64.mul
                    local.set 13
                    local.get 1
                    i32.const -2960
                    local.get 1
                    i32.const -2960
                    i32.gt_u
                    select
                    i32.const 1938
                    i32.add
                    local.set 1
                    br 1 (;@7;)
                  end
                  local.get 13
                  f64.const 0x1p+1023 (;=8.98847e+307;)
                  f64.mul
                  local.set 13
                  local.get 1
                  i32.const 3069
                  local.get 1
                  i32.const 3069
                  i32.lt_u
                  select
                  i32.const -2046
                  i32.add
                  local.set 1
                end
                block  ;; label = @7
                  block  ;; label = @8
                    local.get 13
                    local.get 1
                    i32.const 1023
                    i32.add
                    i64.extend_i32_u
                    i64.const 52
                    i64.shl
                    f64.reinterpret_i64
                    f64.mul
                    local.tee 13
                    f64.const 0x1p+24 (;=1.67772e+07;)
                    f64.ge
                    br_if 0 (;@8;)
                    local.get 13
                    local.set 30
                    br 1 (;@7;)
                  end
                  local.get 6
                  i32.const 480
                  i32.add
                  local.get 29
                  i32.const 2
                  i32.shl
                  i32.add
                  local.get 13
                  local.get 13
                  f64.const 0x1p-24 (;=5.96046e-08;)
                  f64.mul
                  i32.trunc_sat_f64_s
                  f64.convert_i32_s
                  local.tee 30
                  f64.const -0x1p+24 (;=-1.67772e+07;)
                  f64.mul
                  f64.add
                  i32.trunc_sat_f64_s
                  i32.store
                  local.get 29
                  i32.const 1
                  i32.add
                  local.set 29
                  local.get 14
                  local.set 15
                end
                local.get 6
                i32.const 480
                i32.add
                local.get 29
                i32.const 2
                i32.shl
                i32.add
                local.get 30
                i32.trunc_sat_f64_s
                i32.store
              end
              block  ;; label = @6
                block  ;; label = @7
                  block  ;; label = @8
                    block  ;; label = @9
                      local.get 15
                      i32.const 1023
                      i32.gt_s
                      br_if 0 (;@9;)
                      local.get 15
                      i32.const -1022
                      i32.lt_s
                      br_if 1 (;@8;)
                      f64.const 0x1p+0 (;=1;)
                      local.set 13
                      br 3 (;@6;)
                    end
                    local.get 15
                    i32.const 2046
                    i32.gt_u
                    br_if 1 (;@7;)
                    local.get 15
                    i32.const -1023
                    i32.add
                    local.set 15
                    f64.const 0x1p+1023 (;=8.98847e+307;)
                    local.set 13
                    br 2 (;@6;)
                  end
                  block  ;; label = @8
                    local.get 15
                    i32.const -1992
                    i32.le_u
                    br_if 0 (;@8;)
                    local.get 15
                    i32.const 969
                    i32.add
                    local.set 15
                    f64.const 0x1p-969 (;=2.00417e-292;)
                    local.set 13
                    br 2 (;@6;)
                  end
                  local.get 15
                  i32.const -2960
                  local.get 15
                  i32.const -2960
                  i32.gt_u
                  select
                  i32.const 1938
                  i32.add
                  local.set 15
                  f64.const 0x0p+0 (;=0;)
                  local.set 13
                  br 1 (;@6;)
                end
                local.get 15
                i32.const 3069
                local.get 15
                i32.const 3069
                i32.lt_u
                select
                i32.const -2046
                i32.add
                local.set 15
                f64.const inf (;=inf;)
                local.set 13
              end
              local.get 13
              local.get 15
              i32.const 1023
              i32.add
              i64.extend_i32_u
              i64.const 52
              i64.shl
              f64.reinterpret_i64
              f64.mul
              local.set 13
              block  ;; label = @6
                block  ;; label = @7
                  local.get 29
                  i32.const 1
                  i32.and
                  i32.eqz
                  br_if 0 (;@7;)
                  local.get 29
                  local.set 0
                  br 1 (;@6;)
                end
                local.get 6
                i32.const 320
                i32.add
                local.get 29
                i32.const 3
                i32.shl
                i32.add
                local.get 13
                local.get 6
                i32.const 480
                i32.add
                local.get 29
                i32.const 2
                i32.shl
                i32.add
                i32.load
                f64.convert_i32_s
                f64.mul
                f64.store
                local.get 13
                f64.const 0x1p-24 (;=5.96046e-08;)
                f64.mul
                local.set 13
                local.get 29
                i32.const -1
                i32.add
                local.set 0
              end
              block  ;; label = @6
                local.get 29
                i32.eqz
                br_if 0 (;@6;)
                local.get 0
                i32.const 3
                i32.shl
                local.get 6
                i32.const 320
                i32.add
                i32.add
                i32.const -8
                i32.add
                local.set 1
                local.get 0
                i32.const 2
                i32.shl
                local.get 6
                i32.const 480
                i32.add
                i32.add
                i32.const -4
                i32.add
                local.set 8
                loop  ;; label = @7
                  local.get 1
                  local.get 13
                  f64.const 0x1p-24 (;=5.96046e-08;)
                  f64.mul
                  local.tee 30
                  local.get 8
                  i32.load
                  f64.convert_i32_s
                  f64.mul
                  f64.store
                  local.get 1
                  i32.const 8
                  i32.add
                  local.get 13
                  local.get 8
                  i32.const 4
                  i32.add
                  i32.load
                  f64.convert_i32_s
                  f64.mul
                  f64.store
                  local.get 1
                  i32.const -16
                  i32.add
                  local.set 1
                  local.get 8
                  i32.const -8
                  i32.add
                  local.set 8
                  local.get 30
                  f64.const 0x1p-24 (;=5.96046e-08;)
                  f64.mul
                  local.set 13
                  local.get 0
                  i32.const 1
                  i32.ne
                  local.set 9
                  local.get 0
                  i32.const -2
                  i32.add
                  local.set 0
                  local.get 9
                  br_if 0 (;@7;)
                end
              end
              local.get 29
              i32.const 1
              i32.add
              local.set 35
              local.get 6
              i32.const 320
              i32.add
              local.get 29
              i32.const 3
              i32.shl
              i32.add
              local.set 9
              local.get 29
              local.set 1
              loop  ;; label = @6
                block  ;; label = @7
                  block  ;; label = @8
                    local.get 7
                    local.get 29
                    local.get 1
                    local.tee 12
                    i32.sub
                    local.tee 4
                    local.get 7
                    local.get 4
                    i32.lt_u
                    select
                    local.tee 11
                    br_if 0 (;@8;)
                    f64.const 0x0p+0 (;=0;)
                    local.set 13
                    i32.const 0
                    local.set 8
                    br 1 (;@7;)
                  end
                  local.get 11
                  i32.const 1
                  i32.add
                  i32.const -2
                  i32.and
                  local.set 10
                  f64.const 0x0p+0 (;=0;)
                  local.set 13
                  i32.const 0
                  local.set 1
                  i32.const 0
                  local.set 8
                  loop  ;; label = @8
                    local.get 13
                    local.get 1
                    i32.const 1049360
                    i32.add
                    f64.load
                    local.get 9
                    local.get 1
                    i32.add
                    local.tee 0
                    f64.load
                    f64.mul
                    f64.add
                    local.get 1
                    i32.const 1049368
                    i32.add
                    f64.load
                    local.get 0
                    i32.const 8
                    i32.add
                    f64.load
                    f64.mul
                    f64.add
                    local.set 13
                    local.get 1
                    i32.const 16
                    i32.add
                    local.set 1
                    local.get 10
                    local.get 8
                    i32.const 2
                    i32.add
                    local.tee 8
                    i32.ne
                    br_if 0 (;@8;)
                  end
                end
                block  ;; label = @7
                  local.get 11
                  i32.const 1
                  i32.and
                  br_if 0 (;@7;)
                  local.get 13
                  local.get 8
                  i32.const 3
                  i32.shl
                  f64.load offset=1049360
                  local.get 6
                  i32.const 320
                  i32.add
                  local.get 8
                  local.get 12
                  i32.add
                  i32.const 3
                  i32.shl
                  i32.add
                  f64.load
                  f64.mul
                  f64.add
                  local.set 13
                end
                local.get 6
                i32.const 160
                i32.add
                local.get 4
                i32.const 3
                i32.shl
                i32.add
                local.get 13
                f64.store
                local.get 9
                i32.const -8
                i32.add
                local.set 9
                local.get 12
                i32.const -1
                i32.add
                local.set 1
                local.get 12
                br_if 0 (;@6;)
              end
              block  ;; label = @6
                block  ;; label = @7
                  block  ;; label = @8
                    local.get 5
                    br_table 1 (;@7;) 0 (;@8;) 0 (;@8;) 2 (;@6;) 1 (;@7;)
                  end
                  block  ;; label = @8
                    block  ;; label = @9
                      local.get 35
                      i32.const 3
                      i32.and
                      local.tee 0
                      br_if 0 (;@9;)
                      f64.const 0x0p+0 (;=0;)
                      local.set 13
                      local.get 29
                      local.set 8
                      br 1 (;@8;)
                    end
                    local.get 6
                    i32.const 160
                    i32.add
                    local.get 29
                    i32.const 3
                    i32.shl
                    i32.add
                    local.set 1
                    f64.const 0x0p+0 (;=0;)
                    local.set 13
                    local.get 29
                    local.set 8
                    loop  ;; label = @9
                      local.get 8
                      i32.const -1
                      i32.add
                      local.set 8
                      local.get 13
                      local.get 1
                      f64.load
                      f64.add
                      local.set 13
                      local.get 1
                      i32.const -8
                      i32.add
                      local.set 1
                      local.get 0
                      i32.const -1
                      i32.add
                      local.tee 0
                      br_if 0 (;@9;)
                    end
                  end
                  block  ;; label = @8
                    local.get 29
                    i32.const 3
                    i32.lt_u
                    br_if 0 (;@8;)
                    local.get 8
                    i32.const 3
                    i32.shl
                    local.get 6
                    i32.const 160
                    i32.add
                    i32.add
                    i32.const -24
                    i32.add
                    local.set 1
                    loop  ;; label = @9
                      local.get 13
                      local.get 1
                      i32.const 24
                      i32.add
                      f64.load
                      f64.add
                      local.get 1
                      i32.const 16
                      i32.add
                      f64.load
                      f64.add
                      local.get 1
                      i32.const 8
                      i32.add
                      f64.load
                      f64.add
                      local.get 1
                      f64.load
                      f64.add
                      local.set 13
                      local.get 1
                      i32.const -32
                      i32.add
                      local.set 1
                      local.get 8
                      i32.const 3
                      i32.ne
                      local.set 0
                      local.get 8
                      i32.const -4
                      i32.add
                      local.set 8
                      local.get 0
                      br_if 0 (;@9;)
                    end
                  end
                  local.get 2
                  local.get 13
                  f64.neg
                  local.get 13
                  local.get 33
                  select
                  f64.store
                  local.get 6
                  f64.load offset=160
                  local.get 13
                  f64.sub
                  local.set 13
                  block  ;; label = @8
                    local.get 29
                    i32.eqz
                    br_if 0 (;@8;)
                    i32.const 1
                    local.set 1
                    loop  ;; label = @9
                      local.get 13
                      local.get 6
                      i32.const 160
                      i32.add
                      local.get 1
                      i32.const 3
                      i32.shl
                      i32.add
                      f64.load
                      f64.add
                      local.set 13
                      local.get 1
                      local.get 29
                      i32.ge_u
                      br_if 1 (;@8;)
                      local.get 1
                      local.get 1
                      local.get 29
                      i32.lt_u
                      i32.add
                      local.tee 1
                      local.get 29
                      i32.le_u
                      br_if 0 (;@9;)
                    end
                  end
                  local.get 2
                  local.get 13
                  f64.neg
                  local.get 13
                  local.get 33
                  select
                  f64.store offset=8
                  br 6 (;@1;)
                end
                block  ;; label = @7
                  block  ;; label = @8
                    local.get 35
                    i32.const 3
                    i32.and
                    local.tee 0
                    br_if 0 (;@8;)
                    f64.const 0x0p+0 (;=0;)
                    local.set 13
                    local.get 29
                    local.set 8
                    br 1 (;@7;)
                  end
                  local.get 6
                  i32.const 160
                  i32.add
                  local.get 29
                  i32.const 3
                  i32.shl
                  i32.add
                  local.set 1
                  f64.const 0x0p+0 (;=0;)
                  local.set 13
                  local.get 29
                  local.set 8
                  loop  ;; label = @8
                    local.get 8
                    i32.const -1
                    i32.add
                    local.set 8
                    local.get 13
                    local.get 1
                    f64.load
                    f64.add
                    local.set 13
                    local.get 1
                    i32.const -8
                    i32.add
                    local.set 1
                    local.get 0
                    i32.const -1
                    i32.add
                    local.tee 0
                    br_if 0 (;@8;)
                  end
                end
                block  ;; label = @7
                  local.get 29
                  i32.const 3
                  i32.lt_u
                  br_if 0 (;@7;)
                  local.get 8
                  i32.const 3
                  i32.shl
                  local.get 6
                  i32.const 160
                  i32.add
                  i32.add
                  i32.const -24
                  i32.add
                  local.set 1
                  loop  ;; label = @8
                    local.get 13
                    local.get 1
                    i32.const 24
                    i32.add
                    f64.load
                    f64.add
                    local.get 1
                    i32.const 16
                    i32.add
                    f64.load
                    f64.add
                    local.get 1
                    i32.const 8
                    i32.add
                    f64.load
                    f64.add
                    local.get 1
                    f64.load
                    f64.add
                    local.set 13
                    local.get 1
                    i32.const -32
                    i32.add
                    local.set 1
                    local.get 8
                    i32.const 3
                    i32.ne
                    local.set 0
                    local.get 8
                    i32.const -4
                    i32.add
                    local.set 8
                    local.get 0
                    br_if 0 (;@8;)
                  end
                end
                local.get 2
                local.get 13
                f64.neg
                local.get 13
                local.get 33
                select
                f64.store
                br 5 (;@1;)
              end
              f64.const 0x0p+0 (;=0;)
              local.set 36
              local.get 29
              i32.eqz
              br_if 3 (;@2;)
              local.get 6
              i32.const 152
              i32.add
              local.set 9
              local.get 29
              local.set 1
              loop  ;; label = @6
                local.get 9
                local.get 1
                i32.const 3
                i32.shl
                local.tee 8
                i32.add
                local.tee 0
                local.get 0
                f64.load
                local.tee 13
                local.get 6
                i32.const 160
                i32.add
                local.get 8
                i32.add
                local.tee 8
                f64.load
                local.tee 30
                f64.add
                local.tee 22
                f64.store
                local.get 8
                local.get 30
                local.get 13
                local.get 22
                f64.sub
                f64.add
                f64.store
                local.get 1
                i32.const 1
                i32.eq
                local.tee 8
                br_if 2 (;@4;)
                i32.const 1
                local.get 1
                i32.const -1
                i32.add
                local.get 8
                select
                local.tee 1
                br_if 0 (;@6;)
                br 2 (;@4;)
              end
            end
            loop  ;; label = @5
              local.get 10
              i32.const 1
              i32.add
              local.set 10
              local.get 1
              i32.load
              local.set 9
              local.get 1
              i32.const -4
              i32.add
              local.set 1
              local.get 9
              i32.eqz
              br_if 0 (;@5;)
            end
            local.get 29
            local.get 10
            i32.ge_u
            br_if 1 (;@3;)
            local.get 29
            i32.const 1
            i32.add
            local.set 12
            loop  ;; label = @5
              local.get 6
              local.get 12
              local.get 8
              i32.add
              local.tee 9
              i32.const 3
              i32.shl
              i32.add
              local.get 12
              local.get 11
              i32.add
              i32.const 2
              i32.shl
              i32.load offset=1049424
              f64.convert_i32_s
              f64.store
              i32.const 0
              local.set 1
              f64.const 0x0p+0 (;=0;)
              local.set 13
              block  ;; label = @6
                loop  ;; label = @7
                  local.get 13
                  local.get 0
                  local.get 1
                  i32.const 3
                  i32.shl
                  i32.add
                  f64.load
                  local.get 6
                  local.get 9
                  local.get 1
                  i32.sub
                  i32.const 3
                  i32.shl
                  i32.add
                  f64.load
                  f64.mul
                  f64.add
                  local.set 13
                  local.get 1
                  local.get 8
                  i32.ge_u
                  br_if 1 (;@6;)
                  local.get 1
                  local.get 1
                  local.get 8
                  i32.lt_u
                  i32.add
                  local.tee 1
                  local.get 8
                  i32.le_u
                  br_if 0 (;@7;)
                end
              end
              local.get 6
              i32.const 320
              i32.add
              local.get 12
              i32.const 3
              i32.shl
              i32.add
              local.get 13
              f64.store
              local.get 12
              local.get 12
              local.get 10
              i32.lt_u
              i32.add
              local.set 1
              local.get 12
              local.get 10
              i32.ge_u
              br_if 2 (;@3;)
              local.get 1
              local.set 12
              local.get 1
              local.get 10
              i32.le_u
              br_if 0 (;@5;)
              br 2 (;@3;)
            end
          end
        end
        local.get 29
        i32.const 1
        i32.eq
        br_if 0 (;@2;)
        local.get 29
        local.set 1
        block  ;; label = @3
          loop  ;; label = @4
            local.get 9
            local.get 1
            i32.const 3
            i32.shl
            local.tee 8
            i32.add
            local.tee 0
            local.get 0
            f64.load
            local.tee 13
            local.get 6
            i32.const 160
            i32.add
            local.get 8
            i32.add
            local.tee 8
            f64.load
            local.tee 30
            f64.add
            local.tee 22
            f64.store
            local.get 8
            local.get 30
            local.get 13
            local.get 22
            f64.sub
            f64.add
            f64.store
            local.get 1
            i32.const 2
            i32.eq
            local.tee 8
            br_if 1 (;@3;)
            i32.const 2
            local.get 1
            i32.const -1
            i32.add
            local.get 8
            select
            local.tee 1
            i32.const 1
            i32.gt_u
            br_if 0 (;@4;)
          end
        end
        f64.const 0x0p+0 (;=0;)
        local.set 36
        loop  ;; label = @3
          local.get 36
          local.get 6
          i32.const 160
          i32.add
          local.get 29
          i32.const 3
          i32.shl
          i32.add
          f64.load
          f64.add
          local.set 36
          local.get 29
          i32.const 2
          i32.eq
          local.tee 1
          br_if 1 (;@2;)
          i32.const 2
          local.get 29
          i32.const -1
          i32.add
          local.get 1
          select
          local.tee 29
          i32.const 1
          i32.gt_u
          br_if 0 (;@3;)
        end
      end
      local.get 6
      f64.load offset=160
      local.set 13
      block  ;; label = @2
        local.get 33
        i32.eqz
        br_if 0 (;@2;)
        local.get 2
        local.get 13
        f64.neg
        f64.store
        local.get 2
        local.get 36
        f64.neg
        f64.store offset=16
        local.get 2
        local.get 6
        f64.load offset=168
        f64.neg
        f64.store offset=8
        br 1 (;@1;)
      end
      local.get 2
      local.get 13
      f64.store
      local.get 2
      local.get 36
      f64.store offset=16
      local.get 2
      local.get 6
      f64.load offset=168
      f64.store offset=8
    end
    local.get 6
    i32.const 560
    i32.add
    global.set $__stack_pointer
    local.get 31
    i32.const 7
    i32.and)
  (func $_ZN17compiler_builtins4math9libm_math4cosf4cosf17h318e77b23185acbfE (type 21) (param f32) (result f32)
    (local i32 f64 i32 i32 f64 i32 f64)
    global.get $__stack_pointer
    i32.const 16
    i32.sub
    local.tee 1
    global.set $__stack_pointer
    local.get 0
    f64.promote_f32
    local.set 2
    block  ;; label = @1
      block  ;; label = @2
        block  ;; label = @3
          block  ;; label = @4
            local.get 0
            i32.reinterpret_f32
            local.tee 3
            i32.const 2147483647
            i32.and
            local.tee 4
            i32.const 1061752795
            i32.lt_u
            br_if 0 (;@4;)
            block  ;; label = @5
              local.get 4
              i32.const 1081824210
              i32.lt_u
              br_if 0 (;@5;)
              block  ;; label = @6
                local.get 4
                i32.const 1088565718
                i32.lt_u
                br_if 0 (;@6;)
                block  ;; label = @7
                  block  ;; label = @8
                    block  ;; label = @9
                      block  ;; label = @10
                        block  ;; label = @11
                          local.get 4
                          i32.const 2139095039
                          i32.gt_u
                          br_if 0 (;@11;)
                          local.get 1
                          i64.const 0
                          i64.store offset=8
                          block  ;; label = @12
                            block  ;; label = @13
                              local.get 4
                              i32.const 1305022426
                              i32.gt_u
                              br_if 0 (;@13;)
                              local.get 2
                              local.get 2
                              f64.const 0x1.45f306dc9c883p-1 (;=0.63662;)
                              f64.mul
                              f64.const 0x1.8p+52 (;=6.7554e+15;)
                              f64.add
                              f64.const -0x1.8p+52 (;=-6.7554e+15;)
                              f64.add
                              local.tee 5
                              f64.const -0x1.921fb5p+0 (;=-1.5708;)
                              f64.mul
                              f64.add
                              local.get 5
                              f64.const -0x1.110b4611a6263p-26 (;=-1.58933e-08;)
                              f64.mul
                              f64.add
                              local.set 2
                              local.get 5
                              i32.trunc_sat_f64_s
                              local.set 4
                              br 1 (;@12;)
                            end
                            local.get 1
                            local.get 4
                            local.get 4
                            i32.const 23
                            i32.shr_u
                            i32.const -150
                            i32.add
                            local.tee 6
                            i32.const 23
                            i32.shl
                            i32.sub
                            f32.reinterpret_i32
                            f64.promote_f32
                            f64.store
                            local.get 1
                            i32.const 1
                            local.get 1
                            i32.const 8
                            i32.add
                            i32.const 1
                            local.get 6
                            i32.const 0
                            call $_ZN17compiler_builtins4math9libm_math14rem_pio2_large14rem_pio2_large17h87b9bb9d7be612b6E
                            local.set 4
                            block  ;; label = @13
                              local.get 3
                              i32.const 0
                              i32.lt_s
                              br_if 0 (;@13;)
                              local.get 1
                              f64.load offset=8
                              local.set 2
                              br 1 (;@12;)
                            end
                            i32.const 0
                            local.get 4
                            i32.sub
                            local.set 4
                            local.get 1
                            f64.load offset=8
                            f64.neg
                            local.set 2
                          end
                          local.get 4
                          i32.const 3
                          i32.and
                          br_table 2 (;@9;) 3 (;@8;) 4 (;@7;) 1 (;@10;) 2 (;@9;)
                        end
                        local.get 0
                        local.get 0
                        f32.sub
                        local.set 0
                        br 9 (;@1;)
                      end
                      local.get 2
                      local.get 2
                      local.get 2
                      f64.mul
                      local.tee 5
                      f64.mul
                      local.tee 7
                      local.get 5
                      local.get 5
                      f64.mul
                      f64.mul
                      local.get 5
                      f64.const 0x1.6cd878c3b46a7p-19 (;=2.71831e-06;)
                      f64.mul
                      f64.const -0x1.a00f9e2cae774p-13 (;=-0.000198393;)
                      f64.add
                      f64.mul
                      local.get 2
                      local.get 7
                      local.get 5
                      f64.const 0x1.11110896efbb2p-7 (;=0.00833333;)
                      f64.mul
                      f64.const -0x1.5555554cbac77p-3 (;=-0.166667;)
                      f64.add
                      f64.mul
                      f64.add
                      f64.add
                      f32.demote_f64
                      local.set 0
                      br 8 (;@1;)
                    end
                    local.get 2
                    local.get 2
                    f64.mul
                    local.tee 2
                    f64.const -0x1.ffffffd0c5e81p-2 (;=-0.5;)
                    f64.mul
                    f64.const 0x1p+0 (;=1;)
                    f64.add
                    local.get 2
                    local.get 2
                    f64.mul
                    local.tee 5
                    f64.const 0x1.55553e1053a42p-5 (;=0.0416666;)
                    f64.mul
                    f64.add
                    local.get 2
                    local.get 5
                    f64.mul
                    local.get 2
                    f64.const 0x1.99342e0ee5069p-16 (;=2.43904e-05;)
                    f64.mul
                    f64.const -0x1.6c087e80f1e27p-10 (;=-0.00138868;)
                    f64.add
                    f64.mul
                    f64.add
                    f32.demote_f64
                    local.set 0
                    br 7 (;@1;)
                  end
                  local.get 2
                  local.get 2
                  f64.mul
                  local.tee 5
                  local.get 2
                  f64.neg
                  f64.mul
                  local.tee 7
                  local.get 5
                  local.get 5
                  f64.mul
                  f64.mul
                  local.get 5
                  f64.const 0x1.6cd878c3b46a7p-19 (;=2.71831e-06;)
                  f64.mul
                  f64.const -0x1.a00f9e2cae774p-13 (;=-0.000198393;)
                  f64.add
                  f64.mul
                  local.get 7
                  local.get 5
                  f64.const 0x1.11110896efbb2p-7 (;=0.00833333;)
                  f64.mul
                  f64.const -0x1.5555554cbac77p-3 (;=-0.166667;)
                  f64.add
                  f64.mul
                  local.get 2
                  f64.sub
                  f64.add
                  f32.demote_f64
                  local.set 0
                  br 6 (;@1;)
                end
                local.get 2
                local.get 2
                f64.mul
                local.tee 2
                f64.const -0x1.ffffffd0c5e81p-2 (;=-0.5;)
                f64.mul
                f64.const 0x1p+0 (;=1;)
                f64.add
                local.get 2
                local.get 2
                f64.mul
                local.tee 5
                f64.const 0x1.55553e1053a42p-5 (;=0.0416666;)
                f64.mul
                f64.add
                local.get 2
                local.get 5
                f64.mul
                local.get 2
                f64.const 0x1.99342e0ee5069p-16 (;=2.43904e-05;)
                f64.mul
                f64.const -0x1.6c087e80f1e27p-10 (;=-0.00138868;)
                f64.add
                f64.mul
                f64.add
                f32.demote_f64
                f32.neg
                local.set 0
                br 5 (;@1;)
              end
              local.get 4
              i32.const 1085271519
              i32.gt_u
              br_if 2 (;@3;)
              block  ;; label = @6
                local.get 3
                i32.const -1
                i32.le_s
                br_if 0 (;@6;)
                local.get 2
                f64.const -0x1.2d97c7f3321d2p+2 (;=-4.71239;)
                f64.add
                local.tee 5
                local.get 5
                local.get 5
                f64.mul
                local.tee 2
                f64.mul
                local.tee 7
                local.get 2
                local.get 2
                f64.mul
                f64.mul
                local.get 2
                f64.const 0x1.6cd878c3b46a7p-19 (;=2.71831e-06;)
                f64.mul
                f64.const -0x1.a00f9e2cae774p-13 (;=-0.000198393;)
                f64.add
                f64.mul
                local.get 5
                local.get 7
                local.get 2
                f64.const 0x1.11110896efbb2p-7 (;=0.00833333;)
                f64.mul
                f64.const -0x1.5555554cbac77p-3 (;=-0.166667;)
                f64.add
                f64.mul
                f64.add
                f64.add
                f32.demote_f64
                local.set 0
                br 5 (;@1;)
              end
              f64.const -0x1.2d97c7f3321d2p+2 (;=-4.71239;)
              local.get 2
              f64.sub
              local.tee 5
              local.get 5
              local.get 5
              f64.mul
              local.tee 2
              f64.mul
              local.tee 7
              local.get 2
              local.get 2
              f64.mul
              f64.mul
              local.get 2
              f64.const 0x1.6cd878c3b46a7p-19 (;=2.71831e-06;)
              f64.mul
              f64.const -0x1.a00f9e2cae774p-13 (;=-0.000198393;)
              f64.add
              f64.mul
              local.get 5
              local.get 7
              local.get 2
              f64.const 0x1.11110896efbb2p-7 (;=0.00833333;)
              f64.mul
              f64.const -0x1.5555554cbac77p-3 (;=-0.166667;)
              f64.add
              f64.mul
              f64.add
              f64.add
              f32.demote_f64
              local.set 0
              br 4 (;@1;)
            end
            local.get 4
            i32.const 1075235811
            i32.gt_u
            br_if 2 (;@2;)
            block  ;; label = @5
              local.get 3
              i32.const -1
              i32.le_s
              br_if 0 (;@5;)
              f64.const 0x1.921fb54442d18p+0 (;=1.5708;)
              local.get 2
              f64.sub
              local.tee 5
              local.get 5
              local.get 5
              f64.mul
              local.tee 2
              f64.mul
              local.tee 7
              local.get 2
              local.get 2
              f64.mul
              f64.mul
              local.get 2
              f64.const 0x1.6cd878c3b46a7p-19 (;=2.71831e-06;)
              f64.mul
              f64.const -0x1.a00f9e2cae774p-13 (;=-0.000198393;)
              f64.add
              f64.mul
              local.get 5
              local.get 7
              local.get 2
              f64.const 0x1.11110896efbb2p-7 (;=0.00833333;)
              f64.mul
              f64.const -0x1.5555554cbac77p-3 (;=-0.166667;)
              f64.add
              f64.mul
              f64.add
              f64.add
              f32.demote_f64
              local.set 0
              br 4 (;@1;)
            end
            local.get 2
            f64.const 0x1.921fb54442d18p+0 (;=1.5708;)
            f64.add
            local.tee 5
            local.get 5
            local.get 5
            f64.mul
            local.tee 2
            f64.mul
            local.tee 7
            local.get 2
            local.get 2
            f64.mul
            f64.mul
            local.get 2
            f64.const 0x1.6cd878c3b46a7p-19 (;=2.71831e-06;)
            f64.mul
            f64.const -0x1.a00f9e2cae774p-13 (;=-0.000198393;)
            f64.add
            f64.mul
            local.get 5
            local.get 7
            local.get 2
            f64.const 0x1.11110896efbb2p-7 (;=0.00833333;)
            f64.mul
            f64.const -0x1.5555554cbac77p-3 (;=-0.166667;)
            f64.add
            f64.mul
            f64.add
            f64.add
            f32.demote_f64
            local.set 0
            br 3 (;@1;)
          end
          block  ;; label = @4
            local.get 4
            i32.const 964689920
            i32.lt_u
            br_if 0 (;@4;)
            local.get 2
            local.get 2
            f64.mul
            local.tee 2
            f64.const -0x1.ffffffd0c5e81p-2 (;=-0.5;)
            f64.mul
            f64.const 0x1p+0 (;=1;)
            f64.add
            local.get 2
            local.get 2
            f64.mul
            local.tee 5
            f64.const 0x1.55553e1053a42p-5 (;=0.0416666;)
            f64.mul
            f64.add
            local.get 2
            local.get 5
            f64.mul
            local.get 2
            f64.const 0x1.99342e0ee5069p-16 (;=2.43904e-05;)
            f64.mul
            f64.const -0x1.6c087e80f1e27p-10 (;=-0.00138868;)
            f64.add
            f64.mul
            f64.add
            f32.demote_f64
            local.set 0
            br 3 (;@1;)
          end
          local.get 1
          local.get 0
          f32.const 0x1p+120 (;=1.32923e+36;)
          f32.add
          f32.store offset=8
          local.get 1
          f32.load offset=8
          drop
          f32.const 0x1p+0 (;=1;)
          local.set 0
          br 2 (;@1;)
        end
        f64.const -0x1.921fb54442d18p+2 (;=-6.28319;)
        f64.const 0x1.921fb54442d18p+2 (;=6.28319;)
        local.get 3
        i32.const -1
        i32.gt_s
        select
        local.get 2
        f64.add
        local.tee 2
        local.get 2
        f64.mul
        local.tee 2
        f64.const -0x1.ffffffd0c5e81p-2 (;=-0.5;)
        f64.mul
        f64.const 0x1p+0 (;=1;)
        f64.add
        local.get 2
        local.get 2
        f64.mul
        local.tee 5
        f64.const 0x1.55553e1053a42p-5 (;=0.0416666;)
        f64.mul
        f64.add
        local.get 2
        local.get 5
        f64.mul
        local.get 2
        f64.const 0x1.99342e0ee5069p-16 (;=2.43904e-05;)
        f64.mul
        f64.const -0x1.6c087e80f1e27p-10 (;=-0.00138868;)
        f64.add
        f64.mul
        f64.add
        f32.demote_f64
        local.set 0
        br 1 (;@1;)
      end
      f64.const -0x1.921fb54442d18p+1 (;=-3.14159;)
      f64.const 0x1.921fb54442d18p+1 (;=3.14159;)
      local.get 3
      i32.const -1
      i32.gt_s
      select
      local.get 2
      f64.add
      local.tee 2
      local.get 2
      f64.mul
      local.tee 2
      f64.const -0x1.ffffffd0c5e81p-2 (;=-0.5;)
      f64.mul
      f64.const 0x1p+0 (;=1;)
      f64.add
      local.get 2
      local.get 2
      f64.mul
      local.tee 5
      f64.const 0x1.55553e1053a42p-5 (;=0.0416666;)
      f64.mul
      f64.add
      local.get 2
      local.get 5
      f64.mul
      local.get 2
      f64.const 0x1.99342e0ee5069p-16 (;=2.43904e-05;)
      f64.mul
      f64.const -0x1.6c087e80f1e27p-10 (;=-0.00138868;)
      f64.add
      f64.mul
      f64.add
      f32.demote_f64
      f32.neg
      local.set 0
    end
    local.get 1
    i32.const 16
    i32.add
    global.set $__stack_pointer
    local.get 0)
  (func $cosf (type 21) (param f32) (result f32)
    local.get 0
    call $_ZN17compiler_builtins4math9libm_math4cosf4cosf17h318e77b23185acbfE)
  (func $_ZN17compiler_builtins4math9libm_math4sinf4sinf17h6f2d3fbffb404dbeE (type 21) (param f32) (result f32)
    (local i32 f64 i32 i32 f64 i32 f64)
    global.get $__stack_pointer
    i32.const 16
    i32.sub
    local.tee 1
    global.set $__stack_pointer
    local.get 0
    f64.promote_f32
    local.set 2
    block  ;; label = @1
      block  ;; label = @2
        local.get 0
        i32.reinterpret_f32
        local.tee 3
        i32.const 2147483647
        i32.and
        local.tee 4
        i32.const 1061752795
        i32.lt_u
        br_if 0 (;@2;)
        block  ;; label = @3
          local.get 4
          i32.const 1081824210
          i32.lt_u
          br_if 0 (;@3;)
          block  ;; label = @4
            local.get 4
            i32.const 1088565718
            i32.lt_u
            br_if 0 (;@4;)
            block  ;; label = @5
              block  ;; label = @6
                block  ;; label = @7
                  block  ;; label = @8
                    block  ;; label = @9
                      local.get 4
                      i32.const 2139095039
                      i32.gt_u
                      br_if 0 (;@9;)
                      local.get 1
                      i64.const 0
                      i64.store offset=8
                      block  ;; label = @10
                        block  ;; label = @11
                          local.get 4
                          i32.const 1305022426
                          i32.gt_u
                          br_if 0 (;@11;)
                          local.get 2
                          local.get 2
                          f64.const 0x1.45f306dc9c883p-1 (;=0.63662;)
                          f64.mul
                          f64.const 0x1.8p+52 (;=6.7554e+15;)
                          f64.add
                          f64.const -0x1.8p+52 (;=-6.7554e+15;)
                          f64.add
                          local.tee 5
                          f64.const -0x1.921fb5p+0 (;=-1.5708;)
                          f64.mul
                          f64.add
                          local.get 5
                          f64.const -0x1.110b4611a6263p-26 (;=-1.58933e-08;)
                          f64.mul
                          f64.add
                          local.set 2
                          local.get 5
                          i32.trunc_sat_f64_s
                          local.set 4
                          br 1 (;@10;)
                        end
                        local.get 1
                        local.get 4
                        local.get 4
                        i32.const 23
                        i32.shr_u
                        i32.const -150
                        i32.add
                        local.tee 6
                        i32.const 23
                        i32.shl
                        i32.sub
                        f32.reinterpret_i32
                        f64.promote_f32
                        f64.store
                        local.get 1
                        i32.const 1
                        local.get 1
                        i32.const 8
                        i32.add
                        i32.const 1
                        local.get 6
                        i32.const 0
                        call $_ZN17compiler_builtins4math9libm_math14rem_pio2_large14rem_pio2_large17h87b9bb9d7be612b6E
                        local.set 4
                        block  ;; label = @11
                          local.get 3
                          i32.const 0
                          i32.lt_s
                          br_if 0 (;@11;)
                          local.get 1
                          f64.load offset=8
                          local.set 2
                          br 1 (;@10;)
                        end
                        i32.const 0
                        local.get 4
                        i32.sub
                        local.set 4
                        local.get 1
                        f64.load offset=8
                        f64.neg
                        local.set 2
                      end
                      local.get 4
                      i32.const 3
                      i32.and
                      br_table 2 (;@7;) 3 (;@6;) 4 (;@5;) 1 (;@8;) 2 (;@7;)
                    end
                    local.get 0
                    local.get 0
                    f32.sub
                    local.set 0
                    br 7 (;@1;)
                  end
                  local.get 2
                  local.get 2
                  f64.mul
                  local.tee 2
                  f64.const -0x1.ffffffd0c5e81p-2 (;=-0.5;)
                  f64.mul
                  f64.const 0x1p+0 (;=1;)
                  f64.add
                  local.get 2
                  local.get 2
                  f64.mul
                  local.tee 5
                  f64.const 0x1.55553e1053a42p-5 (;=0.0416666;)
                  f64.mul
                  f64.add
                  local.get 2
                  local.get 5
                  f64.mul
                  local.get 2
                  f64.const 0x1.99342e0ee5069p-16 (;=2.43904e-05;)
                  f64.mul
                  f64.const -0x1.6c087e80f1e27p-10 (;=-0.00138868;)
                  f64.add
                  f64.mul
                  f64.add
                  f32.demote_f64
                  f32.neg
                  local.set 0
                  br 6 (;@1;)
                end
                local.get 2
                local.get 2
                local.get 2
                f64.mul
                local.tee 5
                f64.mul
                local.tee 7
                local.get 5
                local.get 5
                f64.mul
                f64.mul
                local.get 5
                f64.const 0x1.6cd878c3b46a7p-19 (;=2.71831e-06;)
                f64.mul
                f64.const -0x1.a00f9e2cae774p-13 (;=-0.000198393;)
                f64.add
                f64.mul
                local.get 2
                local.get 7
                local.get 5
                f64.const 0x1.11110896efbb2p-7 (;=0.00833333;)
                f64.mul
                f64.const -0x1.5555554cbac77p-3 (;=-0.166667;)
                f64.add
                f64.mul
                f64.add
                f64.add
                f32.demote_f64
                local.set 0
                br 5 (;@1;)
              end
              local.get 2
              local.get 2
              f64.mul
              local.tee 2
              f64.const -0x1.ffffffd0c5e81p-2 (;=-0.5;)
              f64.mul
              f64.const 0x1p+0 (;=1;)
              f64.add
              local.get 2
              local.get 2
              f64.mul
              local.tee 5
              f64.const 0x1.55553e1053a42p-5 (;=0.0416666;)
              f64.mul
              f64.add
              local.get 2
              local.get 5
              f64.mul
              local.get 2
              f64.const 0x1.99342e0ee5069p-16 (;=2.43904e-05;)
              f64.mul
              f64.const -0x1.6c087e80f1e27p-10 (;=-0.00138868;)
              f64.add
              f64.mul
              f64.add
              f32.demote_f64
              local.set 0
              br 4 (;@1;)
            end
            local.get 2
            local.get 2
            f64.mul
            local.tee 5
            local.get 2
            f64.neg
            f64.mul
            local.tee 7
            local.get 5
            local.get 5
            f64.mul
            f64.mul
            local.get 5
            f64.const 0x1.6cd878c3b46a7p-19 (;=2.71831e-06;)
            f64.mul
            f64.const -0x1.a00f9e2cae774p-13 (;=-0.000198393;)
            f64.add
            f64.mul
            local.get 7
            local.get 5
            f64.const 0x1.11110896efbb2p-7 (;=0.00833333;)
            f64.mul
            f64.const -0x1.5555554cbac77p-3 (;=-0.166667;)
            f64.add
            f64.mul
            local.get 2
            f64.sub
            f64.add
            f32.demote_f64
            local.set 0
            br 3 (;@1;)
          end
          block  ;; label = @4
            local.get 4
            i32.const 1085271520
            i32.lt_u
            br_if 0 (;@4;)
            f64.const -0x1.921fb54442d18p+2 (;=-6.28319;)
            f64.const 0x1.921fb54442d18p+2 (;=6.28319;)
            local.get 3
            i32.const -1
            i32.gt_s
            select
            local.get 2
            f64.add
            local.tee 5
            local.get 5
            local.get 5
            f64.mul
            local.tee 2
            f64.mul
            local.tee 7
            local.get 2
            local.get 2
            f64.mul
            f64.mul
            local.get 2
            f64.const 0x1.6cd878c3b46a7p-19 (;=2.71831e-06;)
            f64.mul
            f64.const -0x1.a00f9e2cae774p-13 (;=-0.000198393;)
            f64.add
            f64.mul
            local.get 5
            local.get 7
            local.get 2
            f64.const 0x1.11110896efbb2p-7 (;=0.00833333;)
            f64.mul
            f64.const -0x1.5555554cbac77p-3 (;=-0.166667;)
            f64.add
            f64.mul
            f64.add
            f64.add
            f32.demote_f64
            local.set 0
            br 3 (;@1;)
          end
          block  ;; label = @4
            local.get 3
            i32.const 0
            i32.lt_s
            br_if 0 (;@4;)
            local.get 2
            f64.const -0x1.2d97c7f3321d2p+2 (;=-4.71239;)
            f64.add
            local.tee 2
            local.get 2
            f64.mul
            local.tee 2
            f64.const -0x1.ffffffd0c5e81p-2 (;=-0.5;)
            f64.mul
            f64.const 0x1p+0 (;=1;)
            f64.add
            local.get 2
            local.get 2
            f64.mul
            local.tee 5
            f64.const 0x1.55553e1053a42p-5 (;=0.0416666;)
            f64.mul
            f64.add
            local.get 2
            local.get 5
            f64.mul
            local.get 2
            f64.const 0x1.99342e0ee5069p-16 (;=2.43904e-05;)
            f64.mul
            f64.const -0x1.6c087e80f1e27p-10 (;=-0.00138868;)
            f64.add
            f64.mul
            f64.add
            f32.demote_f64
            f32.neg
            local.set 0
            br 3 (;@1;)
          end
          local.get 2
          f64.const 0x1.2d97c7f3321d2p+2 (;=4.71239;)
          f64.add
          local.tee 2
          local.get 2
          f64.mul
          local.tee 2
          f64.const -0x1.ffffffd0c5e81p-2 (;=-0.5;)
          f64.mul
          f64.const 0x1p+0 (;=1;)
          f64.add
          local.get 2
          local.get 2
          f64.mul
          local.tee 5
          f64.const 0x1.55553e1053a42p-5 (;=0.0416666;)
          f64.mul
          f64.add
          local.get 2
          local.get 5
          f64.mul
          local.get 2
          f64.const 0x1.99342e0ee5069p-16 (;=2.43904e-05;)
          f64.mul
          f64.const -0x1.6c087e80f1e27p-10 (;=-0.00138868;)
          f64.add
          f64.mul
          f64.add
          f32.demote_f64
          local.set 0
          br 2 (;@1;)
        end
        block  ;; label = @3
          local.get 4
          i32.const 1075235812
          i32.lt_u
          br_if 0 (;@3;)
          f64.const -0x1.921fb54442d18p+1 (;=-3.14159;)
          f64.const 0x1.921fb54442d18p+1 (;=3.14159;)
          local.get 3
          i32.const -1
          i32.gt_s
          select
          local.get 2
          f64.add
          local.tee 5
          local.get 5
          f64.mul
          local.tee 2
          local.get 5
          f64.neg
          f64.mul
          local.tee 7
          local.get 2
          local.get 2
          f64.mul
          f64.mul
          local.get 2
          f64.const 0x1.6cd878c3b46a7p-19 (;=2.71831e-06;)
          f64.mul
          f64.const -0x1.a00f9e2cae774p-13 (;=-0.000198393;)
          f64.add
          f64.mul
          local.get 7
          local.get 2
          f64.const 0x1.11110896efbb2p-7 (;=0.00833333;)
          f64.mul
          f64.const -0x1.5555554cbac77p-3 (;=-0.166667;)
          f64.add
          f64.mul
          local.get 5
          f64.sub
          f64.add
          f32.demote_f64
          local.set 0
          br 2 (;@1;)
        end
        block  ;; label = @3
          local.get 3
          i32.const 0
          i32.lt_s
          br_if 0 (;@3;)
          local.get 2
          f64.const -0x1.921fb54442d18p+0 (;=-1.5708;)
          f64.add
          local.tee 2
          local.get 2
          f64.mul
          local.tee 2
          f64.const -0x1.ffffffd0c5e81p-2 (;=-0.5;)
          f64.mul
          f64.const 0x1p+0 (;=1;)
          f64.add
          local.get 2
          local.get 2
          f64.mul
          local.tee 5
          f64.const 0x1.55553e1053a42p-5 (;=0.0416666;)
          f64.mul
          f64.add
          local.get 2
          local.get 5
          f64.mul
          local.get 2
          f64.const 0x1.99342e0ee5069p-16 (;=2.43904e-05;)
          f64.mul
          f64.const -0x1.6c087e80f1e27p-10 (;=-0.00138868;)
          f64.add
          f64.mul
          f64.add
          f32.demote_f64
          local.set 0
          br 2 (;@1;)
        end
        local.get 2
        f64.const 0x1.921fb54442d18p+0 (;=1.5708;)
        f64.add
        local.tee 2
        local.get 2
        f64.mul
        local.tee 2
        f64.const -0x1.ffffffd0c5e81p-2 (;=-0.5;)
        f64.mul
        f64.const 0x1p+0 (;=1;)
        f64.add
        local.get 2
        local.get 2
        f64.mul
        local.tee 5
        f64.const 0x1.55553e1053a42p-5 (;=0.0416666;)
        f64.mul
        f64.add
        local.get 2
        local.get 5
        f64.mul
        local.get 2
        f64.const 0x1.99342e0ee5069p-16 (;=2.43904e-05;)
        f64.mul
        f64.const -0x1.6c087e80f1e27p-10 (;=-0.00138868;)
        f64.add
        f64.mul
        f64.add
        f32.demote_f64
        f32.neg
        local.set 0
        br 1 (;@1;)
      end
      block  ;; label = @2
        local.get 4
        i32.const 964689920
        i32.lt_u
        br_if 0 (;@2;)
        local.get 2
        local.get 2
        f64.mul
        local.tee 5
        local.get 2
        f64.mul
        local.tee 7
        local.get 5
        local.get 5
        f64.mul
        f64.mul
        local.get 5
        f64.const 0x1.6cd878c3b46a7p-19 (;=2.71831e-06;)
        f64.mul
        f64.const -0x1.a00f9e2cae774p-13 (;=-0.000198393;)
        f64.add
        f64.mul
        local.get 7
        local.get 5
        f64.const 0x1.11110896efbb2p-7 (;=0.00833333;)
        f64.mul
        f64.const -0x1.5555554cbac77p-3 (;=-0.166667;)
        f64.add
        f64.mul
        local.get 2
        f64.add
        f64.add
        f32.demote_f64
        local.set 0
        br 1 (;@1;)
      end
      local.get 1
      local.get 0
      f32.const 0x1p-120 (;=7.52316e-37;)
      f32.mul
      local.get 0
      f32.const 0x1p+120 (;=1.32923e+36;)
      f32.add
      local.get 4
      i32.const 8388608
      i32.lt_u
      select
      f32.store offset=8
      local.get 1
      f32.load offset=8
      drop
    end
    local.get 1
    i32.const 16
    i32.add
    global.set $__stack_pointer
    local.get 0)
  (func $sinf (type 21) (param f32) (result f32)
    local.get 0
    call $_ZN17compiler_builtins4math9libm_math4sinf4sinf17h6f2d3fbffb404dbeE)
  (func $_ZN17compiler_builtins4math9libm_math4tanf4tanf17ha492a31a7717f1b1E (type 21) (param f32) (result f32)
    (local i32 f64 i32 i32 f64 f64 i32)
    global.get $__stack_pointer
    i32.const 16
    i32.sub
    local.tee 1
    global.set $__stack_pointer
    local.get 0
    f64.promote_f32
    local.set 2
    block  ;; label = @1
      block  ;; label = @2
        local.get 0
        i32.reinterpret_f32
        local.tee 3
        i32.const 2147483647
        i32.and
        local.tee 4
        i32.const 1061752795
        i32.lt_u
        br_if 0 (;@2;)
        block  ;; label = @3
          local.get 4
          i32.const 1081824210
          i32.lt_u
          br_if 0 (;@3;)
          block  ;; label = @4
            local.get 4
            i32.const 1088565718
            i32.lt_u
            br_if 0 (;@4;)
            block  ;; label = @5
              local.get 4
              i32.const 2139095039
              i32.gt_u
              br_if 0 (;@5;)
              local.get 1
              i64.const 0
              i64.store offset=8
              block  ;; label = @6
                block  ;; label = @7
                  local.get 4
                  i32.const 1305022426
                  i32.gt_u
                  br_if 0 (;@7;)
                  local.get 2
                  local.get 2
                  f64.const 0x1.45f306dc9c883p-1 (;=0.63662;)
                  f64.mul
                  f64.const 0x1.8p+52 (;=6.7554e+15;)
                  f64.add
                  f64.const -0x1.8p+52 (;=-6.7554e+15;)
                  f64.add
                  local.tee 5
                  f64.const -0x1.921fb5p+0 (;=-1.5708;)
                  f64.mul
                  f64.add
                  local.get 5
                  f64.const -0x1.110b4611a6263p-26 (;=-1.58933e-08;)
                  f64.mul
                  f64.add
                  local.set 6
                  local.get 5
                  i32.trunc_sat_f64_s
                  local.set 4
                  br 1 (;@6;)
                end
                local.get 1
                local.get 4
                local.get 4
                i32.const 23
                i32.shr_u
                i32.const -150
                i32.add
                local.tee 7
                i32.const 23
                i32.shl
                i32.sub
                f32.reinterpret_i32
                f64.promote_f32
                f64.store
                local.get 1
                i32.const 1
                local.get 1
                i32.const 8
                i32.add
                i32.const 1
                local.get 7
                i32.const 0
                call $_ZN17compiler_builtins4math9libm_math14rem_pio2_large14rem_pio2_large17h87b9bb9d7be612b6E
                local.set 4
                block  ;; label = @7
                  local.get 3
                  i32.const 0
                  i32.lt_s
                  br_if 0 (;@7;)
                  local.get 1
                  f64.load offset=8
                  local.set 6
                  br 1 (;@6;)
                end
                i32.const 0
                local.get 4
                i32.sub
                local.set 4
                local.get 1
                f64.load offset=8
                f64.neg
                local.set 6
              end
              f64.const -0x1p+0 (;=-1;)
              local.get 6
              local.get 6
              local.get 6
              local.get 6
              f64.mul
              local.tee 2
              f64.mul
              local.tee 5
              local.get 2
              f64.const 0x1.112fd38999f72p-3 (;=0.133392;)
              f64.mul
              f64.const 0x1.5554d3418c99fp-2 (;=0.333331;)
              f64.add
              f64.mul
              f64.add
              local.get 5
              local.get 2
              local.get 2
              f64.mul
              local.tee 6
              f64.mul
              local.get 2
              f64.const 0x1.91df3908c33cep-6 (;=0.0245283;)
              f64.mul
              f64.const 0x1.b54c91d865afep-5 (;=0.0533812;)
              f64.add
              local.get 6
              local.get 2
              f64.const 0x1.362b9bf971bcdp-7 (;=0.00946565;)
              f64.mul
              f64.const 0x1.85dadfcecf44ep-9 (;=0.00297436;)
              f64.add
              f64.mul
              f64.add
              f64.mul
              f64.add
              local.tee 2
              f64.div
              local.get 2
              local.get 4
              i32.const 1
              i32.and
              select
              f32.demote_f64
              local.set 0
              br 4 (;@1;)
            end
            local.get 0
            local.get 0
            f32.sub
            local.set 0
            br 3 (;@1;)
          end
          block  ;; label = @4
            local.get 4
            i32.const 1085271520
            i32.lt_u
            br_if 0 (;@4;)
            f64.const -0x1.921fb54442d18p+2 (;=-6.28319;)
            f64.const 0x1.921fb54442d18p+2 (;=6.28319;)
            local.get 3
            i32.const -1
            i32.gt_s
            select
            local.get 2
            f64.add
            local.tee 6
            local.get 6
            local.get 6
            local.get 6
            f64.mul
            local.tee 2
            f64.mul
            local.tee 6
            local.get 2
            f64.const 0x1.112fd38999f72p-3 (;=0.133392;)
            f64.mul
            f64.const 0x1.5554d3418c99fp-2 (;=0.333331;)
            f64.add
            f64.mul
            f64.add
            local.get 6
            local.get 2
            local.get 2
            f64.mul
            local.tee 5
            f64.mul
            local.get 2
            f64.const 0x1.91df3908c33cep-6 (;=0.0245283;)
            f64.mul
            f64.const 0x1.b54c91d865afep-5 (;=0.0533812;)
            f64.add
            local.get 5
            local.get 2
            f64.const 0x1.362b9bf971bcdp-7 (;=0.00946565;)
            f64.mul
            f64.const 0x1.85dadfcecf44ep-9 (;=0.00297436;)
            f64.add
            f64.mul
            f64.add
            f64.mul
            f64.add
            f32.demote_f64
            local.set 0
            br 3 (;@1;)
          end
          f64.const -0x1p+0 (;=-1;)
          f64.const -0x1.2d97c7f3321d2p+2 (;=-4.71239;)
          f64.const 0x1.2d97c7f3321d2p+2 (;=4.71239;)
          local.get 3
          i32.const -1
          i32.gt_s
          select
          local.get 2
          f64.add
          local.tee 6
          local.get 6
          local.get 6
          local.get 6
          f64.mul
          local.tee 2
          f64.mul
          local.tee 6
          local.get 2
          f64.const 0x1.112fd38999f72p-3 (;=0.133392;)
          f64.mul
          f64.const 0x1.5554d3418c99fp-2 (;=0.333331;)
          f64.add
          f64.mul
          f64.add
          local.get 6
          local.get 2
          local.get 2
          f64.mul
          local.tee 5
          f64.mul
          local.get 2
          f64.const 0x1.91df3908c33cep-6 (;=0.0245283;)
          f64.mul
          f64.const 0x1.b54c91d865afep-5 (;=0.0533812;)
          f64.add
          local.get 5
          local.get 2
          f64.const 0x1.362b9bf971bcdp-7 (;=0.00946565;)
          f64.mul
          f64.const 0x1.85dadfcecf44ep-9 (;=0.00297436;)
          f64.add
          f64.mul
          f64.add
          f64.mul
          f64.add
          f64.div
          f32.demote_f64
          local.set 0
          br 2 (;@1;)
        end
        block  ;; label = @3
          local.get 4
          i32.const 1075235812
          i32.lt_u
          br_if 0 (;@3;)
          f64.const -0x1.921fb54442d18p+1 (;=-3.14159;)
          f64.const 0x1.921fb54442d18p+1 (;=3.14159;)
          local.get 3
          i32.const -1
          i32.gt_s
          select
          local.get 2
          f64.add
          local.tee 6
          local.get 6
          local.get 6
          local.get 6
          f64.mul
          local.tee 2
          f64.mul
          local.tee 6
          local.get 2
          f64.const 0x1.112fd38999f72p-3 (;=0.133392;)
          f64.mul
          f64.const 0x1.5554d3418c99fp-2 (;=0.333331;)
          f64.add
          f64.mul
          f64.add
          local.get 6
          local.get 2
          local.get 2
          f64.mul
          local.tee 5
          f64.mul
          local.get 2
          f64.const 0x1.91df3908c33cep-6 (;=0.0245283;)
          f64.mul
          f64.const 0x1.b54c91d865afep-5 (;=0.0533812;)
          f64.add
          local.get 5
          local.get 2
          f64.const 0x1.362b9bf971bcdp-7 (;=0.00946565;)
          f64.mul
          f64.const 0x1.85dadfcecf44ep-9 (;=0.00297436;)
          f64.add
          f64.mul
          f64.add
          f64.mul
          f64.add
          f32.demote_f64
          local.set 0
          br 2 (;@1;)
        end
        f64.const -0x1p+0 (;=-1;)
        f64.const -0x1.921fb54442d18p+0 (;=-1.5708;)
        f64.const 0x1.921fb54442d18p+0 (;=1.5708;)
        local.get 3
        i32.const -1
        i32.gt_s
        select
        local.get 2
        f64.add
        local.tee 6
        local.get 6
        local.get 6
        local.get 6
        f64.mul
        local.tee 2
        f64.mul
        local.tee 6
        local.get 2
        f64.const 0x1.112fd38999f72p-3 (;=0.133392;)
        f64.mul
        f64.const 0x1.5554d3418c99fp-2 (;=0.333331;)
        f64.add
        f64.mul
        f64.add
        local.get 6
        local.get 2
        local.get 2
        f64.mul
        local.tee 5
        f64.mul
        local.get 2
        f64.const 0x1.91df3908c33cep-6 (;=0.0245283;)
        f64.mul
        f64.const 0x1.b54c91d865afep-5 (;=0.0533812;)
        f64.add
        local.get 5
        local.get 2
        f64.const 0x1.362b9bf971bcdp-7 (;=0.00946565;)
        f64.mul
        f64.const 0x1.85dadfcecf44ep-9 (;=0.00297436;)
        f64.add
        f64.mul
        f64.add
        f64.mul
        f64.add
        f64.div
        f32.demote_f64
        local.set 0
        br 1 (;@1;)
      end
      block  ;; label = @2
        local.get 4
        i32.const 964689920
        i32.lt_u
        br_if 0 (;@2;)
        local.get 2
        local.get 2
        f64.mul
        local.tee 6
        local.get 2
        f64.mul
        local.tee 5
        local.get 6
        f64.const 0x1.112fd38999f72p-3 (;=0.133392;)
        f64.mul
        f64.const 0x1.5554d3418c99fp-2 (;=0.333331;)
        f64.add
        f64.mul
        local.get 2
        f64.add
        local.get 5
        local.get 6
        local.get 6
        f64.mul
        local.tee 2
        f64.mul
        local.get 6
        f64.const 0x1.91df3908c33cep-6 (;=0.0245283;)
        f64.mul
        f64.const 0x1.b54c91d865afep-5 (;=0.0533812;)
        f64.add
        local.get 2
        local.get 6
        f64.const 0x1.362b9bf971bcdp-7 (;=0.00946565;)
        f64.mul
        f64.const 0x1.85dadfcecf44ep-9 (;=0.00297436;)
        f64.add
        f64.mul
        f64.add
        f64.mul
        f64.add
        f32.demote_f64
        local.set 0
        br 1 (;@1;)
      end
      local.get 1
      local.get 0
      f32.const 0x1p-120 (;=7.52316e-37;)
      f32.mul
      local.get 0
      f32.const 0x1p+120 (;=1.32923e+36;)
      f32.add
      local.get 4
      i32.const 8388608
      i32.lt_u
      select
      f32.store offset=8
      local.get 1
      f32.load offset=8
      drop
    end
    local.get 1
    i32.const 16
    i32.add
    global.set $__stack_pointer
    local.get 0)
  (func $_ZN17compiler_builtins4math20partial_availability5acosf17hde54984e4dc3fee8E (type 21) (param f32) (result f32)
    (local i32 i32 f32 f32)
    block  ;; label = @1
      block  ;; label = @2
        local.get 0
        i32.reinterpret_f32
        local.tee 1
        i32.const 2147483647
        i32.and
        local.tee 2
        i32.const 1065353215
        i32.gt_u
        br_if 0 (;@2;)
        block  ;; label = @3
          local.get 2
          i32.const 1056964608
          i32.lt_u
          br_if 0 (;@3;)
          block  ;; label = @4
            local.get 1
            i32.const -1
            i32.le_s
            br_if 0 (;@4;)
            f32.const 0x1p+0 (;=1;)
            local.get 0
            f32.sub
            f32.const 0x1p-1 (;=0.5;)
            f32.mul
            local.tee 0
            f32.sqrt
            local.tee 3
            local.get 0
            local.get 0
            local.get 0
            f32.const -0x1.1ba6d6p-7 (;=-0.00865636;)
            f32.mul
            f32.const -0x1.5e2774p-5 (;=-0.0427434;)
            f32.add
            f32.mul
            f32.const 0x1.5554eap-3 (;=0.166666;)
            f32.add
            f32.mul
            local.get 0
            f32.const -0x1.69cb5cp-1 (;=-0.70663;)
            f32.mul
            f32.const 0x1p+0 (;=1;)
            f32.add
            f32.div
            f32.mul
            local.get 0
            local.get 3
            i32.reinterpret_f32
            i32.const -4096
            i32.and
            f32.reinterpret_i32
            local.tee 4
            local.get 4
            f32.mul
            f32.sub
            local.get 3
            local.get 4
            f32.add
            f32.div
            f32.add
            local.get 4
            f32.add
            local.tee 0
            local.get 0
            f32.add
            return
          end
          f32.const 0x1.921fb4p+0 (;=1.5708;)
          local.get 0
          f32.const 0x1p+0 (;=1;)
          f32.add
          f32.const 0x1p-1 (;=0.5;)
          f32.mul
          local.tee 0
          f32.sqrt
          local.tee 4
          local.get 4
          local.get 0
          local.get 0
          local.get 0
          f32.const -0x1.1ba6d6p-7 (;=-0.00865636;)
          f32.mul
          f32.const -0x1.5e2774p-5 (;=-0.0427434;)
          f32.add
          f32.mul
          f32.const 0x1.5554eap-3 (;=0.166666;)
          f32.add
          f32.mul
          local.get 0
          f32.const -0x1.69cb5cp-1 (;=-0.70663;)
          f32.mul
          f32.const 0x1p+0 (;=1;)
          f32.add
          f32.div
          f32.mul
          f32.const -0x1.4442dp-24 (;=-7.54979e-08;)
          f32.add
          f32.add
          f32.sub
          local.tee 0
          local.get 0
          f32.add
          return
        end
        f32.const 0x1.921fb4p+0 (;=1.5708;)
        local.set 4
        local.get 2
        i32.const 847249409
        i32.lt_u
        br_if 1 (;@1;)
        f32.const 0x1.4442dp-24 (;=7.54979e-08;)
        local.get 0
        local.get 0
        local.get 0
        f32.mul
        local.tee 4
        local.get 4
        local.get 4
        f32.const -0x1.1ba6d6p-7 (;=-0.00865636;)
        f32.mul
        f32.const -0x1.5e2774p-5 (;=-0.0427434;)
        f32.add
        f32.mul
        f32.const 0x1.5554eap-3 (;=0.166666;)
        f32.add
        f32.mul
        local.get 4
        f32.const -0x1.69cb5cp-1 (;=-0.70663;)
        f32.mul
        f32.const 0x1p+0 (;=1;)
        f32.add
        f32.div
        f32.mul
        f32.sub
        local.get 0
        f32.sub
        f32.const 0x1.921fb4p+0 (;=1.5708;)
        f32.add
        return
      end
      block  ;; label = @2
        local.get 2
        i32.const 1065353216
        i32.eq
        br_if 0 (;@2;)
        f32.const 0x0p+0 (;=0;)
        local.get 0
        local.get 0
        f32.sub
        f32.div
        return
      end
      f32.const 0x0p+0 (;=0;)
      f32.const 0x1.921fb4p+1 (;=3.14159;)
      local.get 1
      i32.const -1
      i32.gt_s
      select
      local.set 4
    end
    local.get 4)
  (func $acosf (type 21) (param f32) (result f32)
    local.get 0
    call $_ZN17compiler_builtins4math20partial_availability5acosf17hde54984e4dc3fee8E)
  (func $tanf (type 21) (param f32) (result f32)
    local.get 0
    call $_ZN17compiler_builtins4math9libm_math4tanf4tanf17ha492a31a7717f1b1E)
  (table (;0;) 4 4 funcref)
  (memory (;0;) 17)
  (global $__stack_pointer (mut i32) (i32.const 1048576))
  (global (;1;) i32 (i32.const 1049728))
  (global (;2;) i32 (i32.const 1049724))
  (export "memory" (memory 0))
  (export "mat4_abs" (func $mat4_abs))
  (export "mat4_add" (func $mat4_add))
  (export "mat4_copy" (func $mat4_copy))
  (export "mat4_det" (func $mat4_det))
  (export "mat4_identity" (func $mat4_identity))
  (export "mat4_init" (func $mat4_init))
  (export "mat4_invert" (func $mat4_invert))
  (export "mat4_isEqual" (func $mat4_isEqual))
  (export "mat4_isIdentity" (func $mat4_isIdentity))
  (export "mat4_isInverse" (func $mat4_isInverse))
  (export "mat4_isZero" (func $mat4_isZero))
  (export "mat4_lookAt" (func $mat4_lookAt))
  (export "mat4_mul" (func $mat4_mul))
  (export "mat4_mul_vec4" (func $mat4_mul_vec4))
  (export "mat4_neg" (func $mat4_neg))
  (export "mat4_norm" (func $mat4_norm))
  (export "mat4_normalize" (func $mat4_normalize))
  (export "mat4_normsq" (func $mat4_normsq))
  (export "mat4_perspective" (func $mat4_perspective))
  (export "mat4_print" (func $mat4_print))
  (export "mat4_random" (func $mat4_random))
  (export "mat4_random_range" (func $mat4_random_range))
  (export "mat4_rotateX" (func $mat4_rotateX))
  (export "mat4_rotateY" (func $mat4_rotateY))
  (export "mat4_rotateZ" (func $mat4_rotateZ))
  (export "mat4_round" (func $mat4_round))
  (export "mat4_scl" (func $mat4_scl))
  (export "mat4_sub" (func $mat4_sub))
  (export "mat4_trace" (func $mat4_trace))
  (export "mat4_translate" (func $mat4_translate))
  (export "mat4_transpose" (func $mat4_transpose))
  (export "quat_abs" (func $quat_abs))
  (export "quat_add" (func $quat_add))
  (export "quat_copy" (func $quat_copy))
  (export "quat_dist" (func $quat_dist))
  (export "quat_distsq" (func $quat_distsq))
  (export "quat_fromAxisAngle" (func $quat_fromAxisAngle))
  (export "quat_init" (func $quat_init))
  (export "quat_invert" (func $quat_invert))
  (export "quat_isEqual" (func $quat_isEqual))
  (export "quat_isNormalized" (func $quat_isNormalized))
  (export "quat_isZero" (func $quat_isZero))
  (export "quat_mul" (func $quat_mul))
  (export "quat_neg" (func $quat_neg))
  (export "quat_norm" (func $quat_norm))
  (export "quat_normalize" (func $quat_normalize))
  (export "quat_normscl" (func $quat_normscl))
  (export "quat_normsq" (func $quat_normsq))
  (export "quat_random" (func $quat_random))
  (export "quat_random_range" (func $quat_random_range))
  (export "quat_round" (func $quat_round))
  (export "quat_scl" (func $quat_scl))
  (export "quat_slerp" (func $quat_slerp))
  (export "quat_sub" (func $quat_sub))
  (export "quat_toRotation" (func $quat_toRotation))
  (export "transform_compose_local_many" (func $transform_compose_local_many))
  (export "transform_pack_model_normal_mat4_from_ptrs" (func $transform_pack_model_normal_mat4_from_ptrs))
  (export "transform_update_world_ordered" (func $transform_update_world_ordered))
  (export "vec3_abs" (func $vec3_abs))
  (export "vec3_add" (func $vec3_add))
  (export "vec3_ang" (func $vec3_ang))
  (export "vec3_angBetween" (func $vec3_angBetween))
  (export "vec3_copy" (func $vec3_copy))
  (export "vec3_cross" (func $vec3_cross))
  (export "vec3_dist" (func $vec3_dist))
  (export "vec3_distsq" (func $vec3_distsq))
  (export "vec3_dot" (func $vec3_dot))
  (export "vec3_init" (func $vec3_init))
  (export "vec3_interp" (func $vec3_interp))
  (export "vec3_isEqual" (func $vec3_isEqual))
  (export "vec3_isNormalized" (func $vec3_isNormalized))
  (export "vec3_isOrthogonal" (func $vec3_isOrthogonal))
  (export "vec3_isParallel" (func $vec3_isParallel))
  (export "vec3_isZero" (func $vec3_isZero))
  (export "vec3_neg" (func $vec3_neg))
  (export "vec3_norm" (func $vec3_norm))
  (export "vec3_normalize" (func $vec3_normalize))
  (export "vec3_normscl" (func $vec3_normscl))
  (export "vec3_normsq" (func $vec3_normsq))
  (export "vec3_oproj" (func $vec3_oproj))
  (export "vec3_proj" (func $vec3_proj))
  (export "vec3_random" (func $vec3_random))
  (export "vec3_random_range" (func $vec3_random_range))
  (export "vec3_reflect" (func $vec3_reflect))
  (export "vec3_refract" (func $vec3_refract))
  (export "vec3_round" (func $vec3_round))
  (export "vec3_scl" (func $vec3_scl))
  (export "vec3_sub" (func $vec3_sub))
  (export "wasmgpu_alloc" (func $wasmgpu_alloc))
  (export "__heap_base" (global 1))
  (export "wasmgpu_alloc_f32" (func $wasmgpu_alloc_f32))
  (export "wasmgpu_frame_alloc" (func $wasmgpu_frame_alloc))
  (export "wasmgpu_frame_alloc_f32" (func $wasmgpu_frame_alloc_f32))
  (export "wasmgpu_frame_arena_cap" (func $wasmgpu_frame_arena_cap))
  (export "wasmgpu_frame_arena_init" (func $wasmgpu_frame_arena_init))
  (export "wasmgpu_frame_arena_reset" (func $wasmgpu_frame_arena_reset))
  (export "wasmgpu_frame_arena_used" (func $wasmgpu_frame_arena_used))
  (export "wasmgpu_free" (func $wasmgpu_free))
  (export "wasmgpu_seed" (func $wasmgpu_seed))
  (export "quat_print" (func $mat4_print))
  (export "vec3_print" (func $mat4_print))
  (export "wasmgpu_free_f32" (func $wasmgpu_free))
  (export "__data_end" (global 2))
  (elem (;0;) (i32.const 1) func $_ZN4core3fmt3num3imp54_$LT$impl$u20$core..fmt..Display$u20$for$u20$usize$GT$3fmt17hfcc4f6d8bf65995eE $_ZN4core5panic12PanicPayload6as_str17h1af804a37c6a66baE $_ZN93_$LT$std..panicking..panic_handler..StaticStrPayload$u20$as$u20$core..panic..PanicPayload$GT$6as_str17hc028f8efa205acb2E)
  (data $.rodata (i32.const 1048576) " index out of bounds: the len is \c0\12 but the index is \c0\00src\5ctransform.rs\007\00\10\00\10\00\00\00\13\00\00\00\16\00\00\007\00\10\00\10\00\00\00\14\00\00\00\16\00\00\007\00\10\00\10\00\00\00\15\00\00\00\16\00\00\007\00\10\00\10\00\00\00\17\00\00\00\15\00\00\007\00\10\00\10\00\00\00*\00\00\00\0d\00\00\007\00\10\00\10\00\00\00\8b\00\00\00\11\00\00\007\00\10\00\10\00\00\00b\00\00\00\15\00\00\007\00\10\00\10\00\00\00b\00\00\00!\00\00\007\00\10\00\10\00\00\00b\00\00\00-\00\00\007\00\10\00\10\00\00\00b\00\00\009\00\00\007\00\10\00\10\00\00\00b\00\00\00E\00\00\007\00\10\00\10\00\00\00b\00\00\00Q\00\00\007\00\10\00\10\00\00\00b\00\00\00]\00\00\007\00\10\00\10\00\00\00b\00\00\00i\00\00\007\00\10\00\10\00\00\00c\00\00\00]\00\00\007\00\10\00\10\00\00\00d\00\00\00]\00\00\007\00\10\00\10\00\00\00e\00\00\00]\00\00\007\00\10\00\10\00\00\00g\00\00\00!\00\00\007\00\10\00\10\00\00\00g\00\00\009\00\00\007\00\10\00\10\00\00\00g\00\00\00Q\00\00\007\00\10\00\10\00\00\00g\00\00\00i\00\00\007\00\10\00\10\00\00\00l\00\00\00!\00\00\007\00\10\00\10\00\00\00l\00\00\009\00\00\007\00\10\00\10\00\00\00l\00\00\00Q\00\00\007\00\10\00\10\00\00\00l\00\00\00i\00\00\007\00\10\00\10\00\00\00q\00\00\00!\00\00\007\00\10\00\10\00\00\00q\00\00\009\00\00\007\00\10\00\10\00\00\00q\00\00\00Q\00\00\007\00\10\00\10\00\00\00q\00\00\00i\00\00\007\00\10\00\10\00\00\00w\00\00\00\11\00\00\007\00\10\00\10\00\00\00W\00\00\00\22\00\00\0000010203040506070809101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960616263646566676869707172737475767778798081828384858687888990919293949596979899\03\00\00\00\04\00\00\00\04\00\00\00\06\00\00\00\00\00\00@\fb!\f9?\00\00\00\00-Dt>\00\00\00\80\98F\f8<\00\00\00`Q\ccx;\00\00\00\80\83\1b\f09\00\00\00@ %z8\00\00\00\80\22\82\e36\00\00\00\00\1d\f3i5\83\f9\a2\00DNn\00\fc)\15\00\d1W'\00\dd4\f5\00b\db\c0\00<\99\95\00A\90C\00cQ\fe\00\bb\de\ab\00\b7a\c5\00:n$\00\d2MB\00I\06\e0\00\09\ea.\00\1c\92\d1\00\eb\1d\fe\00)\b1\1c\00\e8>\a7\00\f55\82\00D\bb.\00\9c\e9\84\00\b4&p\00A~_\00\d6\919\00S\839\00\9c\f49\00\8b_\84\00(\f9\bd\00\f8\1f;\00\de\ff\97\00\0f\98\05\00\11/\ef\00\0aZ\8b\00m\1fm\00\cf~6\00\09\cb'\00FO\b7\00\9ef?\00-\ea_\00\ba'u\00\e5\eb\c7\00={\f1\00\f79\07\00\92R\8a\00\fbk\ea\00\1f\b1_\00\08]\8d\000\03V\00{\fcF\00\f0\abk\00 \bc\cf\006\f4\9a\00\e3\a9\1d\00^a\91\00\08\1b\e6\00\85\99e\00\a0\14_\00\8d@h\00\80\d8\ff\00'sM\00\06\061\00\caV\15\00\c9\a8s\00{\e2`\00k\8c\c0\00")
  (data $.data (i32.const 1049688) "\ff\ff\ff\ffxV4\12"))
