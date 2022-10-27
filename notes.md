# Notes

## TODO

- risistemare appunti
- testare bene messaggi persi, messaggi che vengono rimessi in coda continuamente, ecc
- costruire sistema per non perdere mai messaggi (anck / nack, deadletter, ecc)
- fare esercizi proposti

## Varie

Scritto in earlang, ha 10 anni, message broker.
Si mantene una connessione aperta con il server rabbit (stateful) sia producer che consumer.
È molto conosciuto per essere un software che "parte e va", non ha bisogno di configurazione iniziale.
Un gran punto di forza è la flessibilità che si può avere coi messaggi (fa un sacco di cose coi messaggi).
Forte nella disaccoppiameto: il producer conosce solo gli ex ed i produder le code.
Sulla coda è possibile mettere n consumer!
Rabbit nasce per essere un cluster locale (nella stessa macchina) ma è possibile fare reti distrubuite di nodi
I messaggi, di default, vengono mandati in roungd robin a tutti i consumer, in modalità FIFO, ma non per un mesaggio alla volta!! Dipende dal prefetch!
Quando arriva un messaggio arriva su rabbit, esso va in memoria e anche su disco.

Il consumer deve attaccarsi ad una coda

## Termini

- producer: componente che spedisce un messaggio al server rabbit (attraverso un exchange)
- consumer: componente che riceve un messaggio (attaccandosi ad una coda e restando in ascolto sui messaggi che arrivano su essa)
- channel: partizione logica della connessione http che va sul server rabbit
- queue: componente che riceve i messaggi dall'exchage
- exchange: componente che sta tra il producer e la coda. È colui che sa cosa farne del messaggio ricevuto
- binding: dall'ex alla coda, legare un ex alla coda (non c'entra il consumer ora)
- server name queue: quando nel consumer non dichiaro una cosa (nome vuoto) crea comunque una coda di default. È una coda temporanea (con autodelete true se si stacca il consumer la coda muore)

## Struttura

I messaggi non vengono pubblicati sulle code, ma sull'exchange.
Il producer deve sapere su quale ex andare a pubblicare. Esso poi lo mette sulle code.

## Dove utilizzarlo

- comunicazione microservizi
-

## Exchange

Non si può cambiare tipo di ex, va cancellato e rifatto.

Tipo di ex

- direct: prende il messaggio e a seconda del binding creato (se c'è un metch diretto tra la routing key del messaggio e della coda) il messaggio verrà messo dentro la coda.
- fanout: lo stesso messaggio viene propagato in tutte le code in cui è stato fatto il binding
- topic: quello più usato e versatile, possibilità di fare match su routing key speciale, per esempio (a.b.\*).

## Queue

Tipi:

- classic: quella da sempre, si distinguono il v1 e v2, uguali a livello di codice
- quorum: al contrario della classic, hanno un mecaniscmo di replica diverso. Sono più stabili, sicure e performanti

## Routing

## Publish sincrono

Quando un messaggio viene pubblicato, per design, con il publish è sincrono e basta. Non si può fare await e aspettare che rabbit abbiamo preso in carico il messaggio e fare quello che deve.
Per capire questo occorre creare un channel speciale, confirmationChannel, e usare l'istruzione channel.waitForConfirmation().
Siccome sta roba si paga, considerare di usare il waitForConfirmation ogni n messaggi.

Se per caso un messaggio è stato scartato, rimandarlo.
Quindi tenere in memoria il buffer dei messaggi che sto mandando. Se va tutto bene scartare quei messaggi, se c'è stato un errore rimandarli.
Questo viene chiamato `Outbox pattern`; ovviamente si paga in fatto di performance.
Siccome in quei 10 messaggi 5 potrebbero essere stati eseguiti e 5 no, rimandarli tutti e 10 vuol dire processare i certi messaggi 2 volte (perchè ad ora non è possibile sapere quali sono stati processati o meno).
Per risolvere questo problema rendere idempotenete, ovvero che processando due volte lo stesso mesaggio non vengano duplicati gli ordini (esempio).
Questo comportamento è già presente nel driver per nodejs!

## Prefetch

Numero di messaggi che il consumer ti prenderà; impostarlo sempre, non c'è un default di base.
Se il prefetch è 1, finchè il messaggio non viene consumato, il consumer non prende in considerazione nessun altro messaggio.
Se il prefetch è 10, c'è un buffer di 10. Questo vuol dire che se il consumer consuma 1mess, e il totale è 9, un altro messaggio viene "aggiunto al buffer" del consumer.
Tenere un pref maggiore di 1 con nodejs per esempio, fa in modo che il consumer prenda in carico un messaggio alla volta.

## Ack / nack

Per dire a rabbit di aver consumato il messaggio, nel consumer, occorre usare il meccanismo di `ack`.
Se il pref è a 1 e non mando un ack, a quel consumer non verrà mandato nessun altro messaggio, perchè per rabbit il consumer sta già lavorando.

Quando un consumer da un errore, occorre gestirlo.
Se non viene gestito il channel viene killato e siamo del gatto.
Se "silenziamo" l'eccezione (non facciamo retrothown) rabbit tratta un messaggio che ha dato errore ed uno buono alla stessa maniera (no buono)
Usare quindi il meccanismo di nack / ack.
Mettere quindi un try catch dove se va tutto bene fare ack() e un nack() sul catch.
Per attenzione perchè se il messaggio darà sempre errore, il nack ridarà sempre il messaggio al consumer in un loop infinito.
Usare quindi il comando nack('')
Se arriva un messaggio con redeliveded true, mettere uno sleep

Tutto quello che è stato detto sopra è per le code classic.
Per le quorum abbiamo cose più carine. È possibile usare il parametro `deliveryCount` per dirgli quante volte riprovarci.

## Messaggi scartati

Il deadletter queue ci aiuta in varie situazione
Un messaggio può essere perso pechè

- il publish non ha code dove metterlo
- il consumer ha fatto nack del messaggio

Partiamo dal producer.
Dobbiao fare in modo che l nostro exchange abbia un posto dove mettere tutti i messaggi che non ha avuto modo di ruotare.
Utilizzare il deadletter exchange! Si può creare alla creazione dell'exchange oppure tramite policy.
Per cui in questo modo abbiamo beccato tutti gli errori che l'exchange non ha ruotato.
Ora essi sono su una coda apposita. L'unica in cui non c'è un consumer attaccato!
Va messo un alert su questa coda e ternerla monitorata.
Per spostare quei messaggi è possbibile usare lo showel.

Lato consumer, sempre con le policy, si va a specificare il deadletter per la coda.

## TTL

Esiste un ttl per sia per i messaggi nella coda sia che di permanenza nel consumer.
È possibile mettere

## Policy

Quando un ex / queue viene creato, deve essere distrutto per cambiarne le caratteristiche.
Invece no! È possiible utiizzare le policy per cambiare on the fly le impostazioni.

## Stream

Modo per non consumare i messaggi dentro la coda.

## Consigli

- aprire una connessione separata per producer e consumer
- Mettere allarmi o limiti sule code che non crescano
- Per avere tutti i messaggi su più code, usare un ex fanout e delle code temporanee
- non creare e distruggere code continuamente, il numero delle code dovrebbe essere stabile
- creare un altro ex quando il numero di binding supera i 100
- aggiungere un id (uuid su campo msg.proprieties,messageId) al publish del messaggio
- usare sempre i durable su code e ex, e persistent sui messaggi
- non usare RPC!!! Così non gestisco la temporal cooupling
- mettere sempre metriche sulla coda in cui finiscono i messaggi morti

## Metriche

È opportuno mettere allarmi su:

- deadlettere queue dev'essere vuota
- consumer su ognicoda: deve esserci almeno un consumer su ogni coda
- non devi mai avere troppi messaggi sulle code

Non fare scraping troppo aggressivo (va bene ogni 15 - 30 sec)
Usare prometheus (c'è un pluing esistente) e grafana

## Domande

- al contrario di altri message broker, è lui che manda i messaggi?
- sento che kafka viene fuori parecchio, potresti dirci le differenze?
- prima hai detto che un messaggio arriva ad un solo consumer: ma con l'ex giusto si può fare un broadcast
- hai detto di non usare rabbit solo per pubblicare su una coda, che così è sprecato: cosa utilizzare in questo caso? Il modello pub/sub di redis?
