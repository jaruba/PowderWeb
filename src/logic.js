import appLogic from './containers/App/logic'
import authLogic from './containers/Auth/logic'
import counterLogic from './containers/Dashboard/logic'

// Combine logic
export default [
  ...appLogic,
  ...authLogic,
  ...counterLogic,
]
