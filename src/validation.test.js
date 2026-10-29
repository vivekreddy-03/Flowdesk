const test = require('node:test');
const assert = require('node:assert/strict');
const { register, login, workspace, kind, recordCreate, recordPatch } = require('./validation');

test('registration accepts valid input and normalizes email', () => {
  const result = register.safeParse({ name: 'Vivek', email: 'TEST@example.com', password: 'long-enough-password' });
  assert.equal(result.success, true);
  assert.equal(result.data.email, 'test@example.com');
});
test('registration rejects short passwords and extra fields', () => {
  assert.equal(register.safeParse({name:'A',email:'a@example.com',password:'short'}).success, false);
  assert.equal(register.safeParse({name:'A',email:'a@example.com',password:'long-enough-password',admin:true}).success, false);
});
test('login rejects invalid email', () => {
  assert.equal(login.safeParse({email:'not-an-email',password:'something'}).success, false);
});
test('workspace and record types are constrained', () => {
  assert.equal(workspace.safeParse('service').success, true);
  assert.equal(workspace.safeParse('admin').success, false);
  assert.equal(kind.safeParse('booking').success, true);
  assert.equal(kind.safeParse('unknown').success, false);
});
test('record creation rejects negative amounts and unexpected fields', () => {
  const base = {workspace:'service',kind:'transaction',title:'Payment',amount:20,status:'Paid'};
  assert.equal(recordCreate.safeParse(base).success, true);
  assert.equal(recordCreate.safeParse({...base,amount:-1}).success, false);
  assert.equal(recordCreate.safeParse({...base,isAdmin:true}).success, false);
});
test('record patch only accepts mutable fields', () => {
  assert.equal(recordPatch.safeParse({status:'Paid'}).success, true);
  assert.equal(recordPatch.safeParse({workspace:'creator'}).success, false);
});
