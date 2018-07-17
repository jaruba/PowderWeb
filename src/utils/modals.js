
import events from 'utils/events'

export default {
	open: (modalName, modalData) => {
		events.emit('openModal', { type: modalName, query: modalData })
	},
	close: () => {
		events.emit('closeModal')
	}
}
